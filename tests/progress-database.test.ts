import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { curriculumSchema } from '@/lib/curriculum';
import { markedPageSample } from '@/mocks/markedPage.sample';
import { loadProgress } from '@/lib/db/progress';

const database = new PGlite();
const alice = '00000000-0000-4000-8000-000000000091';
const bob = '00000000-0000-4000-8000-000000000092';
const course = curriculumSchema.parse(
  JSON.parse(await readFile('curriculum/course.draft.json', 'utf8')),
);
const ielts = curriculumSchema.parse(
  JSON.parse(await readFile('curriculum/ielts.draft.json', 'utf8')),
);
const queryLog = vi.hoisted(() => ({ queries: [] as string[] }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/client', () => ({
  withUserDatabase: (userId: string, work: (transaction: unknown) => Promise<unknown>) =>
    drizzle(database, {
      logger: { logQuery: (query) => queryLog.queries.push(query) },
    }).transaction(async (transaction) => {
      await transaction.execute(sql`SELECT set_config('request.jwt.claim.sub', ${userId}, true)`);
      await transaction.execute(sql`SET LOCAL ROLE authenticated`);
      return work(transaction);
    }),
}));

let submissionNumber = 0;
async function addCheck(
  owner: string,
  daysAgo: number,
  scores: number,
  options: { attempt?: number; parent?: string; safety?: boolean; taskId?: string } = {},
) {
  submissionNumber++;
  const id = `00000000-0000-4000-8000-${String(submissionNumber).padStart(12, '0')}`;
  await database.query(
    `INSERT INTO writing.submissions(id,user_id,task_id,text,word_count,attempt,parent_submission_id,status,created_at)
     VALUES ($1,$2,$3,'Synthetic text',50,$4,$5,'completed',now() - ($6 || ' days')::interval)`,
    [id, owner, options.taskId ?? 'weekend', options.attempt ?? 1, options.parent ?? null, daysAgo],
  );
  await database.query(
    `INSERT INTO writing.feedback(submission_id,user_id,json,model,prompt_version) VALUES ($1,$2,$3,'test','test')`,
    [
      id,
      owner,
      JSON.stringify({
        ...markedPageSample,
        scores: { task: scores, organization: scores, grammar: scores, vocabulary: scores },
        corrections: [],
        safety_flag: options.safety ?? false,
      }),
    ],
  );
  return id;
}

beforeAll(async () => {
  await database.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    'SELECT nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
    GRANT USAGE ON SCHEMA auth TO authenticated;
    INSERT INTO auth.users VALUES ('${alice}'), ('${bob}');`);
  for (const migration of [
    '0000_writing.sql',
    '0002_recoverable_checks.sql',
    '0003_correction_explanations.sql',
    '0004_practice.sql',
    '0005_correction_choices.sql',
    '0006_preferences.sql',
    '0007_profiles.sql',
    '0008_curriculum.sql',
    '0009_writing_course.sql',
    '0010_target_evidence.sql',
    '0012_mastery_advisory.sql',
    '0014_benchmark_context.sql',
  ])
    await database.exec(await readFile(`drizzle/${migration}`, 'utf8'));
  for (const unit of [...course, ...ielts])
    await database.query('INSERT INTO writing.curriculum_units VALUES ($1,$2,$3,$4,$5,now(),$6)', [
      unit.id,
      unit.level,
      unit.order,
      JSON.stringify(unit),
      'Synthetic test only',
      'test-hash',
    ]);
  await database.query(
    "INSERT INTO writing.placement_results(user_id,status,result,chosen_level) VALUES ($1,'completed',$2,'PRE_A1')",
    [
      alice,
      JSON.stringify({ cefr: 'A1', confidence: 0.5, reason: 'Synthetic test', safety_flag: false }),
    ],
  );
  for (const [index, score] of [2, 2, 2, 3, 4, 4].entries())
    await addCheck(alice, 20 - index * 3, score);
  const parent = await addCheck(alice, 1, 2);
  await addCheck(alice, 0, 4, { attempt: 2, parent });
  await addCheck(alice, 0, 5, { safety: true });
  await addCheck(bob, 2, 1);
});
afterAll(() => database.close());
it('reads shared course inputs once while retaining both tracks', async () => {
  queryLog.queries = [];
  const report = await loadProgress(alice);
  const reads = queryLog.queries.filter(
    (query) => query.startsWith('select') && query.includes('"curriculum_units"'),
  );
  expect(reads).toHaveLength(1);
  expect(report.course.core.lessonsTotal).toBeGreaterThan(0);
  expect(report.course.ielts.lessonsTotal).toBeGreaterThan(0);
});
it('loads only owner safe reviewed benchmark pairs and freezes their content identity', async () => {
  const context = {
    unitId: course[0].id,
    contentHash: 'reviewed-pair',
    role: 'baseline',
    minWords: 5,
    maxWords: 20,
  };
  const first = await addCheck(alice, 3, 2, { taskId: course[0].lessons[0].task.id });
  const last = await addCheck(alice, 1, 4, { taskId: course[0].lessons.at(-1)!.task.id });
  for (const [id, role] of [
    [first, 'baseline'],
    [last, 'checkpoint'],
  ])
    await database.query('UPDATE writing.submissions SET benchmark_context=$1 WHERE id=$2', [
      JSON.stringify({ ...context, role }),
      id,
    ]);
  const result = await loadProgress(alice);
  expect(result.benchmarks).toMatchObject([
    { unitId: course[0].id, scoreDelta: 2, scoreChange: 'uncalibrated' },
  ]);
  expect((await loadProgress(bob)).benchmarks).toEqual([]);
  await database.query('DELETE FROM writing.submissions WHERE id=$1 OR id=$2', [first, last]);
});

it('reports first-attempt improvement, revision gain, and course progress for the owner only', async () => {
  const report = await loadProgress(alice);
  expect(report.improvement.firstChecks).toBe(7);
  expect(report.improvement.thenVsNow?.then.average).toBe(2);
  expect(report.improvement.thenVsNow?.now.average).toBeCloseTo(3.3, 1);
  expect(report.improvement.revisionGain).toEqual({ pairs: 1, averageDelta: 2 });
  expect(report.improvement.weekly.reduce((sum, week) => sum + week.checks, 0)).toBe(7);
  expect(report.course.core).toMatchObject({ lessonsDone: 0, lessonsTotal: 63 });
  expect(report.course.core.current?.lessonId).toBe(course[0].lessons[0].id);
  expect(report.course.ielts.lessonsTotal).toBe(24);
  const other = await loadProgress(bob);
  expect(other.improvement.firstChecks).toBe(1);
  expect(other.course.core.current).toBeNull();
  expect(report.benchmarks).toEqual([]);
  expect(other.benchmarks).toEqual([]);
});
