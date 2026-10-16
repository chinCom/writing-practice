import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { sql } from 'drizzle-orm';
import { beforeAll, afterAll, expect, it, vi } from 'vitest';
import { curriculumSchema } from '@/lib/curriculum';
import { loadPath, loadLesson, loadTask, answerWarmup } from '@/lib/db/curriculum';

const database = new PGlite();
const alice = '00000000-0000-4000-8000-000000000071';
const bob = '00000000-0000-4000-8000-000000000072';
const course = curriculumSchema.parse(
  JSON.parse(await readFile('curriculum/course.draft.json', 'utf8')),
);
const ielts = curriculumSchema.parse(
  JSON.parse(await readFile('curriculum/ielts.draft.json', 'utf8')),
);
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/client', () => ({
  withUserDatabase: (userId: string, work: (transaction: unknown) => Promise<unknown>) =>
    drizzle(database).transaction(async (transaction) => {
      await transaction.execute(sql`SELECT set_config('request.jwt.claim.sub', ${userId}, true)`);
      await transaction.execute(sql`SET LOCAL ROLE authenticated`);
      return work(transaction);
    }),
}));
beforeAll(async () => {
  await database.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS 'SELECT nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
    GRANT USAGE ON SCHEMA auth TO authenticated; INSERT INTO auth.users VALUES ('${alice}'),('${bob}');`);
  for (const name of [
    '0000_writing',
    '0008_curriculum',
    '0009_writing_course',
    '0010_target_evidence',
    '0012_mastery_advisory',
  ])
    await database.exec(await readFile('drizzle/' + name + '.sql', 'utf8'));
  for (const unit of [...course, ...ielts])
    await database.query('INSERT INTO writing.curriculum_units VALUES ($1,$2,$3,$4,$5,now(),$6)', [
      unit.id,
      unit.level,
      unit.order,
      JSON.stringify(unit),
      'Synthetic test only',
      'test-hash',
    ]);
  for (const userId of [alice, bob])
    await database.query(
      "INSERT INTO writing.placement_results(user_id,status,result,chosen_level) VALUES ($1,'completed',$2,'PRE_A1')",
      [
        userId,
        JSON.stringify({
          cefr: 'A1',
          confidence: 0.5,
          reason: 'Synthetic test',
          safety_flag: false,
        }),
      ],
    );
});
afterAll(() => database.close());
it('traverses all 63 lessons through owner-only server grading and safe writing, with checkpoint failures blocked', async () => {
  const lessons = course.flatMap((unit) => unit.lessons);
  for (const [index, lesson] of lessons.entries()) {
    let path = await loadPath(alice);
    let publicLessons = path.units.flatMap((unit) => unit.lessons);
    expect(publicLessons[index].state).toBe('current');
    expect(JSON.stringify(path)).not.toMatch(/"(?:answer|hint)":/);
    expect((await loadLesson(alice, lesson.id)).task.id).toBe(lesson.task.id);
    await expect(loadTask(alice, lesson.task.id)).rejects.toThrow('WARMUPS_REQUIRED');
    if (index + 1 < lessons.length)
      await expect(loadLesson(alice, lessons[index + 1].id)).rejects.toThrow('LESSON_LOCKED');
    for (const [warmupIndex, warmup] of lesson.warmups.entries()) {
      expect(
        (await answerWarmup(alice, lesson.id, warmupIndex, 'incorrect synthetic answer')).correct,
      ).toBe(false);
      expect((await answerWarmup(alice, lesson.id, warmupIndex, warmup.answer)).correct).toBe(true);
    }
    expect((await loadTask(alice, lesson.task.id)).targetLevel).toBe(lesson.task.targetLevel);
    expect((await loadPath(alice)).units.flatMap((unit) => unit.lessons)[index].state).toBe(
      'current',
    );
    const id = crypto.randomUUID();
    await database.query(
      "INSERT INTO writing.submissions(id,user_id,task_id,text,word_count,attempt,status) VALUES ($1,$2,$3,$4,$5,1,'completed')",
      [id, alice, lesson.task.id, lesson.miniLesson.modelText, lesson.task.minWords],
    );
    const scores = { task: 4, organization: 4, grammar: 4, vocabulary: 4 };
    await database.query(
      "INSERT INTO writing.feedback(submission_id,user_id,json,model,prompt_version) VALUES ($1,$2,$3,'test','test')",
      [id, alice, JSON.stringify({ safety_flag: true, scores })],
    );
    expect((await loadPath(alice)).units.flatMap((unit) => unit.lessons)[index].state).toBe(
      'current',
    );
    if (lesson.task.isCheckpoint) {
      await database.query('UPDATE writing.feedback SET json=$1 WHERE submission_id=$2', [
        JSON.stringify({ safety_flag: false, scores: { ...scores, grammar: 2 } }),
        id,
      ]);
      expect((await loadPath(alice)).units.flatMap((unit) => unit.lessons)[index].state).toBe(
        'current',
      );
    }
    await database.query('UPDATE writing.feedback SET json=$1 WHERE submission_id=$2', [
      JSON.stringify({ safety_flag: false, scores }),
      id,
    ]);
    path = await loadPath(alice);
    publicLessons = path.units.flatMap((unit) => unit.lessons);
    expect(publicLessons[index].state).toBe('done');
    if (index + 1 < lessons.length) expect(publicLessons[index + 1].state).toBe('current');
  }
  expect(
    (await loadPath(alice)).units
      .flatMap((unit) => unit.lessons)
      .every((lesson) => lesson.state === 'done'),
  ).toBe(true);
  const other = (await loadPath(bob)).units.flatMap((unit) => unit.lessons);
  expect(other[0].state).toBe('current');
  expect(other.slice(1).every((lesson) => lesson.state === 'locked')).toBe(true);
}, 30000);

it('resolves every IELTS lesson and task with independent units, private answers, and owned checkpoint progress', async () => {
  for (const unit of ielts) {
    const first = await loadLesson(alice, unit.lessons[0].id);
    expect(first.state).toBe('current');
    for (const [index, lesson] of unit.lessons.entries()) {
      expect((await loadLesson(alice, lesson.id)).task.id).toBe(lesson.task.id);
      await expect(loadTask(alice, lesson.task.id)).rejects.toThrow('WARMUPS_REQUIRED');
      for (const [warmupIndex, warmup] of lesson.warmups.entries())
        await answerWarmup(alice, lesson.id, warmupIndex, warmup.answer);
      expect((await loadTask(alice, lesson.task.id)).minWords).toBe(lesson.task.minWords);
      const id = crypto.randomUUID();
      await database.query(
        "INSERT INTO writing.submissions(id,user_id,task_id,text,word_count,attempt,status) VALUES ($1,$2,$3,$4,$5,1,'completed')",
        [id, alice, lesson.task.id, lesson.miniLesson.modelText, lesson.task.minWords],
      );
      const scores = { task: 4, organization: 4, grammar: 4, vocabulary: 4 };
      await database.query(
        "INSERT INTO writing.feedback(submission_id,user_id,json,model,prompt_version) VALUES ($1,$2,$3,'test','test')",
        [id, alice, JSON.stringify({ safety_flag: true, scores })],
      );
      expect((await loadLesson(alice, lesson.id)).state).toBe('current');
      if (lesson.task.isCheckpoint) {
        await database.query('UPDATE writing.feedback SET json=$1 WHERE submission_id=$2', [
          JSON.stringify({ safety_flag: false, scores: { ...scores, grammar: 2 } }),
          id,
        ]);
        expect((await loadLesson(alice, lesson.id)).state).toBe('current');
      }
      await database.query('UPDATE writing.feedback SET json=$1 WHERE submission_id=$2', [
        JSON.stringify({ safety_flag: false, scores }),
        id,
      ]);
      expect((await loadLesson(alice, lesson.id)).state).toBe('done');
      if (index < 2)
        expect((await loadLesson(alice, unit.lessons[index + 1].id)).state).toBe('current');
    }
  }
  const workspace = await loadPath(alice, 'ielts');
  expect(workspace.units).toHaveLength(8);
  expect(JSON.stringify(workspace)).not.toMatch(/"(?:answer|hint)":/);
  const other = await loadPath(bob, 'ielts');
  expect(other.units.every((unit) => unit.lessons[0].state === 'current')).toBe(true);
  expect(other.units.every((unit) => unit.lessons[1].state === 'locked')).toBe(true);
  expect((await loadPath(alice)).units).toHaveLength(21);
}, 30000);
