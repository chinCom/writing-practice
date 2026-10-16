import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import TodayPage from '@/app/today/page';
import { currentUser } from '@/lib/auth/server';
import { markedPageSample } from '@/mocks/markedPage.sample';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth/server', () => ({ currentUser: vi.fn() }));
// Keep the real application pool, deadlines, queries, and RLS. Replace only transport.
vi.mock('postgres', () => ({ default: () => ({ end: async () => undefined }) }));
vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: () => ({
    transaction: async (work: Parameters<ReturnType<typeof drizzle>['transaction']>[0]) => {
      // Cold transport is healthy, but takes longer than the application's queue deadline.
      await new Promise((resolve) => setTimeout(resolve, 2100));
      return drizzle(database).transaction(work);
    },
  }),
}));

const database = new PGlite();
const alice = '00000000-0000-4000-8000-000000000031';
const bob = '00000000-0000-4000-8000-000000000032';
const aliceSubmission = '00000000-0000-4000-8000-000000000033';
const bobSubmission = '00000000-0000-4000-8000-000000000034';

beforeAll(async () => {
  vi.stubEnv('DATABASE_URL', 'synthetic-transport');
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
    '0012_mastery_advisory.sql',
    '0014_benchmark_context.sql',
  ])
    await database.exec(await readFile(`drizzle/${migration}`, 'utf8'));
  for (const [owner, id, goal] of [
    [alice, aliceSubmission, 3],
    [bob, bobSubmission, 7],
  ] as const) {
    await database.query(
      `INSERT INTO writing.submissions(id,user_id,task_id,text,word_count,attempt,status)
       VALUES ($1,$2,'weekend','Hello friend',40,1,'completed')`,
      [id, owner],
    );
    await database.query(
      `INSERT INTO writing.feedback(submission_id,user_id,json,model,prompt_version)
       VALUES ($1,$2,$3,'test','test')`,
      [id, owner, JSON.stringify({ ...markedPageSample, corrections: [] })],
    );
    await database.query('INSERT INTO writing.preferences(user_id,weekly_goal) VALUES ($1,$2)', [
      owner,
      goal,
    ]);
  }
});

afterAll(async () => {
  // If the regression fails, let the already-started transactions settle before closing PGlite.
  await new Promise((resolve) => setTimeout(resolve, 2300));
  await database.close();
  vi.unstubAllEnvs();
});

it('renders Today through healthy slow startup without timing out its own database queue', async () => {
  vi.mocked(currentUser).mockResolvedValue({ id: alice } as NonNullable<
    Awaited<ReturnType<typeof currentUser>>
  >);
  const page = await TodayPage();
  expect(page.props.signedIn).toBe(true);
  expect(page.props.weeklyGoal).toBe(3);
  expect(page.props.submissions.map((row: { id: string }) => row.id)).toEqual([aliceSubmission]);
  expect(page.props.progress.sessions).toBe(1);
  expect(page.props.due).toBe(0);
}, 15000);

it('does not reuse the previous learner data on the shared Today connection', async () => {
  vi.mocked(currentUser).mockResolvedValue({ id: bob } as NonNullable<
    Awaited<ReturnType<typeof currentUser>>
  >);
  const page = await TodayPage();
  expect(page.props.weeklyGoal).toBe(7);
  expect(page.props.submissions.map((row: { id: string }) => row.id)).toEqual([bobSubmission]);
}, 15000);
