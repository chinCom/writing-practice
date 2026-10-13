import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/pglite';
import { sql } from 'drizzle-orm';
import {
  reserveSubmission,
  completeSubmission,
  loadFeedback,
  loadDraft,
  recentSubmissions,
} from '@/lib/db/queries';
import { markedPageSample } from '@/mocks/markedPage.sample';
import { sampleDraft } from '@/mocks/draft.sample';
import { POST as checkWriting } from '@/app/api/feedback/route';
import { PUT as saveWritingDraft } from '@/app/api/draft/route';
import { currentUser } from '@/lib/auth/server';
import { gradeWriting } from '@/lib/llm/grade';

vi.mock('@/lib/auth/config', () => ({ authConfigured: () => true }));
vi.mock('@/lib/auth/server', () => ({ currentUser: vi.fn() }));
vi.mock('@/lib/llm/grade', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/llm/grade')>()),
  gradeWriting: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/client', () => ({
  withUserDatabase: (userId: string, work: (transaction: unknown) => Promise<unknown>) =>
    drizzle(database).transaction(async (transaction) => {
      await transaction.execute(sql`SELECT set_config('request.jwt.claim.sub', ${userId}, true)`);
      await transaction.execute(sql`SET LOCAL ROLE authenticated`);
      return work(transaction);
    }),
}));

const database = new PGlite();
const alice = '00000000-0000-4000-8000-000000000001';
const bob = '00000000-0000-4000-8000-000000000002';
beforeAll(async () => {
  vi.stubEnv('DATABASE_URL', 'local-test');
  vi.stubEnv('USE_MOCK_LLM', 'true');
  await database.exec(
    `CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      'SELECT nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
    GRANT USAGE ON SCHEMA auth TO authenticated;
    INSERT INTO auth.users VALUES (''), ('');`
      .replace('', alice)
      .replace('', bob),
  );
  await database.exec(await readFile('drizzle/0000_writing.sql', 'utf8'));
});
afterAll(async () => {
  vi.unstubAllEnvs();
  await database.close();
});
async function asUser(userId: string, query: string) {
  return database.transaction(async (transaction) => {
    await transaction.exec(
      `SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '', true);`.replace(
        '',
        userId,
      ),
    );
    return transaction.query(query);
  });
}
it('allows an owner to save a draft but hides it from another learner', async () => {
  await asUser(
    alice,
    `INSERT INTO writing.drafts(user_id, task_id, text) VALUES ('', 'weekend', 'Private draft')`.replace(
      '',
      alice,
    ),
  );
  expect((await asUser(alice, 'SELECT text FROM writing.drafts')).rows).toEqual([
    { text: 'Private draft' },
  ]);
  expect((await asUser(bob, 'SELECT text FROM writing.drafts')).rows).toEqual([]);
  expect(
    (await asUser(bob, `UPDATE writing.drafts SET text = 'Changed' RETURNING text`)).rows,
  ).toEqual([]);
});
it('rejects forged ownership and anonymous access', async () => {
  await expect(
    asUser(
      bob,
      `INSERT INTO writing.drafts(user_id, task_id, text) VALUES ('', 'weekend', 'Forged')`.replace(
        '',
        alice,
      ),
    ),
  ).rejects.toThrow(/row-level security/);
  await expect(
    database.transaction(async (transaction) => {
      await transaction.exec('SET LOCAL ROLE anon');
      return transaction.query('SELECT * FROM writing.drafts');
    }),
  ).rejects.toThrow(/permission denied/);
});
it('prevents a learner from reading another learner’s submitted writing or feedback', async () => {
  await asUser(
    alice,
    `INSERT INTO writing.submissions(id, user_id, task_id, text, word_count, attempt)
    VALUES ('00000000-0000-4000-8000-000000000003', '', 'weekend', 'Private writing', 40, 1)`.replace(
      '',
      alice,
    ),
  );
  await asUser(
    alice,
    `INSERT INTO writing.feedback(submission_id, user_id, json, model, prompt_version)
    VALUES ('00000000-0000-4000-8000-000000000003', '', '{}', 'test', '1')`.replace('', alice),
  );
  expect((await asUser(bob, 'SELECT * FROM writing.submissions')).rows).toEqual([]);
  expect((await asUser(bob, 'SELECT * FROM writing.feedback')).rows).toEqual([]);
});
it('saves writing, completes feedback, reopens it and validates revision ownership', async () => {
  const id = await reserveSubmission(bob, { taskId: 'weekend', text: sampleDraft, attempt: 1 });
  expect(await loadDraft(bob)).toBe(sampleDraft);
  const feedback = { ...markedPageSample, corrections: [] };
  await completeSubmission(bob, id, feedback, {
    data: markedPageSample,
    usage: { promptTokens: 100, completionTokens: 50, cacheHitTokens: 0 },
    model: 'test',
    latencyMs: 10,
    mock: false,
  });
  expect((await loadFeedback(bob, id))?.feedback.json).toEqual(feedback);
  expect(await loadFeedback(alice, id)).toBeNull();
  expect(await recentSubmissions(bob)).toEqual([expect.objectContaining({ id, attempt: 1 })]);
  expect((await asUser(alice, 'SELECT * FROM writing.ai_usage')).rows).toEqual([]);
  await expect(
    reserveSubmission(alice, {
      taskId: 'weekend',
      text: sampleDraft,
      attempt: 2,
      parentSubmissionId: id,
    }),
  ).rejects.toThrow('INVALID_PARENT');
  const revisionId = await reserveSubmission(bob, {
    taskId: 'weekend',
    text: sampleDraft,
    attempt: 2,
    parentSubmissionId: id,
  });
  expect(revisionId).not.toBe(id);
});
it('runs authenticated routes through PostgreSQL without trusting request ownership', async () => {
  const user = { id: alice } as NonNullable<Awaited<ReturnType<typeof currentUser>>>;
  vi.mocked(currentUser).mockResolvedValue(user);
  vi.mocked(gradeWriting).mockResolvedValue({
    data: markedPageSample,
    usage: { promptTokens: 100, completionTokens: 50, cacheHitTokens: 0 },
    model: 'test',
    latencyMs: 10,
    mock: false,
  });
  const request = (path: string, body: unknown, method = 'POST', origin = 'http://localhost') =>
    new Request('http://localhost' + path, {
      method,
      headers: { 'Content-Type': 'application/json', origin },
      body: JSON.stringify(body),
    });
  expect((await saveWritingDraft(request('/api/draft', { text: sampleDraft }, 'PUT'))).status).toBe(
    200,
  );
  const loopbackRequest = request('/api/draft', { text: sampleDraft }, 'PUT', 'http://127.0.0.1');
  loopbackRequest.headers.set('host', '127.0.0.1');
  expect((await saveWritingDraft(loopbackRequest)).status).toBe(200);
  expect(
    (await saveWritingDraft(request('/api/draft', { text: sampleDraft, userId: bob }, 'PUT')))
      .status,
  ).toBe(400);
  expect(
    (
      await checkWriting(
        request(
          '/api/feedback',
          { taskId: 'weekend', text: sampleDraft, attempt: 1 },
          'POST',
          'https://evil.example',
        ),
      )
    ).status,
  ).toBe(403);
  vi.mocked(currentUser).mockResolvedValue(null);
  expect((await checkWriting(request('/api/feedback', {}))).status).toBe(401);
  vi.mocked(currentUser).mockResolvedValue(user);
  const body = { taskId: 'weekend', text: sampleDraft, attempt: 1 };
  const response = await checkWriting(request('/api/feedback', body));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result).toMatchObject({ ok: true, data: { mock: false } });
  expect((await loadFeedback(alice, result.data.submissionId))?.submission.text).toBe(sampleDraft);
  expect(await loadFeedback(bob, result.data.submissionId)).toBeNull();
  await checkWriting(request('/api/feedback', body));
  const limited = await checkWriting(request('/api/feedback', body));
  expect(limited.status).toBe(429);
  expect(await limited.json()).toMatchObject({ error: { code: 'DAILY_LIMIT' } });
  expect(gradeWriting).toHaveBeenCalledTimes(2);
});
it('counts pending checks in the daily limit before calling an AI provider', async () => {
  await reserveSubmission(bob, { taskId: 'weekend', text: sampleDraft, attempt: 1 });
  await expect(
    reserveSubmission(bob, { taskId: 'weekend', text: sampleDraft, attempt: 1 }),
  ).rejects.toThrow('DAILY_LIMIT');
});
