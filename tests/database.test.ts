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
  loadCheck,
  claimSubmission,
  failSubmission,
} from '@/lib/db/queries';
import { markedPageSample } from '@/mocks/markedPage.sample';
import { sampleDraft } from '@/mocks/draft.sample';
import { POST as checkWriting, GET as getCheck } from '@/app/api/feedback/route';
import { PUT as saveWritingDraft } from '@/app/api/draft/route';
import { currentUser } from '@/lib/auth/server';
import { gradeWriting } from '@/lib/llm/grade';
import { explainCorrection } from '@/lib/llm/explain';
import { POST as explainSavedCorrection } from '@/app/api/explanation/route';
import { reserveExplanation, failExplanation } from '@/lib/db/explanations';
vi.mock('@/lib/llm/explain', () => ({ explainCorrection: vi.fn() }));

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
const charlie = '00000000-0000-4000-8000-000000000004';
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
  await database.exec(`INSERT INTO auth.users VALUES ('${charlie}')`);
  await database.exec(await readFile('drizzle/0000_writing.sql', 'utf8'));
  await database.exec(await readFile('drizzle/0002_recoverable_checks.sql', 'utf8'));
  await database.exec(await readFile('drizzle/0003_correction_explanations.sql', 'utf8'));
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
it('reuses a check key, rejects changed content and recovers owner-only feedback', async () => {
  const input = { taskId: 'weekend' as const, text: sampleDraft, attempt: 1 };
  const key = '00000000-0000-4000-8000-000000000010';
  const id = await reserveSubmission(charlie, input, key);
  expect(await reserveSubmission(charlie, input, key)).toBe(id);
  await expect(
    reserveSubmission(charlie, { ...input, text: sampleDraft + ' Again.' }, key),
  ).rejects.toThrow('CHECK_CONFLICT');
  await expect(
    reserveSubmission(charlie, input, '00000000-0000-4000-8000-000000000011'),
  ).rejects.toThrow('CHECK_IN_PROGRESS');
  expect(await loadCheck(bob, key)).toBeNull();
  expect(await loadCheck(charlie, key)).toMatchObject({ id, status: 'pending' });
  expect(await claimSubmission(charlie, id)).toBe(true);
  expect(await claimSubmission(charlie, id)).toBe(false);
  await completeSubmission(
    charlie,
    id,
    { ...markedPageSample, corrections: [] },
    {
      data: markedPageSample,
      usage: { promptTokens: 100, completionTokens: 50, cacheHitTokens: 0 },
      model: 'test',
      latencyMs: 10,
      mock: false,
    },
  );
  await failSubmission(charlie, id);
  expect(await loadCheck(charlie, key)).toMatchObject({ id, status: 'completed' });
  expect(await reserveSubmission(charlie, input, key)).toBe(id);
});
it('recovers a completed API request without a second provider call', async () => {
  vi.mocked(currentUser).mockResolvedValue({ id: charlie } as NonNullable<
    Awaited<ReturnType<typeof currentUser>>
  >);
  vi.mocked(gradeWriting)
    .mockClear()
    .mockResolvedValue({
      data: markedPageSample,
      usage: { promptTokens: 100, completionTokens: 50, cacheHitTokens: 0 },
      model: 'test',
      latencyMs: 10,
      mock: false,
    });
  const key = '00000000-0000-4000-8000-000000000013';
  const request = () =>
    new Request('http://localhost/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
      body: JSON.stringify({ taskId: 'weekend', text: sampleDraft, attempt: 1 }),
    });
  const first = await checkWriting(request());
  expect(first.status).toBe(200);
  const original = await first.json();
  const repeat = await checkWriting(request());
  expect(repeat.status).toBe(200);
  expect((await repeat.json()).data.submissionId).toBe(original.data.submissionId);
  expect(gradeWriting).toHaveBeenCalledTimes(1);
  const status = await getCheck(new Request('http://localhost/api/feedback?requestKey=' + key));
  expect(status.headers.get('cache-control')).toContain('no-store');
  expect(await status.json()).toMatchObject({
    data: { status: 'completed', submissionId: original.data.submissionId },
  });
  vi.mocked(currentUser).mockResolvedValue({ id: bob } as NonNullable<
    Awaited<ReturnType<typeof currentUser>>
  >);
  expect(
    (await getCheck(new Request('http://localhost/api/feedback?requestKey=' + key))).status,
  ).toBe(404);
  vi.mocked(gradeWriting).mockClear();
});
it('rejects oversized request streams before reading the complete body', async () => {
  vi.mocked(currentUser).mockResolvedValue({ id: charlie } as NonNullable<
    Awaited<ReturnType<typeof currentUser>>
  >);
  let chunks = 0;
  const body = new ReadableStream({
    pull(controller) {
      chunks++;
      controller.enqueue(new TextEncoder().encode('x'.repeat(12000)));
      if (chunks === 10) controller.close();
    },
  });
  const request = new Request('http://localhost/api/feedback', {
    method: 'POST',
    body,
    duplex: 'half',
  } as RequestInit);
  expect((await checkWriting(request)).status).toBe(400);
  expect(chunks).toBeLessThan(10);
});
it('marks provider failures as failed and keeps the saved draft', async () => {
  vi.mocked(currentUser).mockResolvedValue({ id: charlie } as NonNullable<
    Awaited<ReturnType<typeof currentUser>>
  >);
  vi.mocked(gradeWriting).mockRejectedValueOnce(new Error('Provider failure'));
  const key = '00000000-0000-4000-8000-000000000014';
  const response = await checkWriting(
    new Request('http://localhost/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
      body: JSON.stringify({ taskId: 'weekend', text: sampleDraft, attempt: 1 }),
    }),
  );
  expect(response.status).toBe(500);
  expect(await loadCheck(charlie, key)).toMatchObject({ status: 'failed' });
  expect(await loadDraft(charlie)).toBe(sampleDraft);
  vi.mocked(gradeWriting).mockClear();
});
it('expires abandoned checks', async () => {
  const key = '00000000-0000-4000-8000-000000000012';
  const id = await reserveSubmission(
    charlie,
    { taskId: 'weekend', text: sampleDraft, attempt: 1 },
    key,
  );
  await database.exec(
    `UPDATE writing.submissions SET created_at = now() - interval '5 minutes' WHERE id = '${id}'`,
  );
  expect(await loadCheck(charlie, key)).toMatchObject({ id, status: 'failed' });
});
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
  for (let index = 0; index < 18; index++) {
    expect((await checkWriting(request('/api/feedback', body))).status).toBe(200);
  }
  const limited = await checkWriting(request('/api/feedback', body));
  expect(limited.status).toBe(429);
  expect(await limited.json()).toMatchObject({ error: { code: 'DAILY_LIMIT' } });
  expect(gradeWriting).toHaveBeenCalledTimes(19);
});
it('counts pending checks in the daily limit before calling an AI provider', async () => {
  for (let index = 0; index < 18; index++) {
    await reserveSubmission(bob, { taskId: 'weekend', text: sampleDraft, attempt: 1 });
  }
  await expect(
    reserveSubmission(bob, { taskId: 'weekend', text: sampleDraft, attempt: 1 }),
  ).rejects.toThrow('DAILY_LIMIT');
});

it('explains saved corrections once, caches by owner and rejects forged or foreign input', async () => {
  const owner = '00000000-0000-4000-8000-000000000005';
  await database.exec(`INSERT INTO auth.users VALUES ('${owner}')`);
  const id = await reserveSubmission(owner, { taskId: 'weekend', text: sampleDraft, attempt: 1 });
  const located = {
    ...markedPageSample,
    corrections: markedPageSample.corrections.map((item) => ({
      ...item,
      start: 0,
      end: item.original.length,
    })),
  };
  await completeSubmission(owner, id, located, {
    data: markedPageSample,
    usage: { promptTokens: 1, completionTokens: 1, cacheHitTokens: 0 },
    model: 'test',
    latencyMs: 1,
    mock: false,
  });
  vi.mocked(currentUser).mockResolvedValue({ id: owner } as NonNullable<
    Awaited<ReturnType<typeof currentUser>>
  >);
  vi.mocked(explainCorrection).mockResolvedValue({
    data: {
      why_original: 'The activity happened before now.',
      why_suggestion: 'Went is the past form of go.',
    },
    usage: { promptTokens: 1, completionTokens: 1, cacheHitTokens: 0 },
    model: 'test',
    latencyMs: 1,
    mock: false,
  });
  const request = (extra = {}) =>
    new Request('http://localhost/api/explanation', {
      method: 'POST',
      headers: { Origin: 'http://localhost', 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId: id, correctionIndex: 0, ...extra }),
    });
  const first = await explainSavedCorrection(request());
  expect(first.status).toBe(200);
  expect(await first.json()).toMatchObject({
    ok: true,
    data: { why_suggestion: 'Went is the past form of go.' },
  });
  expect((await explainSavedCorrection(request())).status).toBe(200);
  expect(vi.mocked(explainCorrection)).toHaveBeenCalledTimes(1);
  expect(vi.mocked(explainCorrection).mock.calls[0][0]).toMatchObject({
    text: sampleDraft,
    original: 'go',
    suggestion: 'went',
  });
  expect((await explainSavedCorrection(request({ original: 'forged' }))).status).toBe(400);
  expect((await explainSavedCorrection(request({ correctionIndex: 3 }))).status).toBe(404);
  vi.mocked(currentUser).mockResolvedValue({ id: bob } as NonNullable<
    Awaited<ReturnType<typeof currentUser>>
  >);
  expect((await explainSavedCorrection(request())).status).toBe(404);
  expect((await asUser(bob, 'SELECT * FROM writing.correction_explanations')).rows).toHaveLength(0);
  expect(vi.mocked(explainCorrection)).toHaveBeenCalledTimes(1);
  const claim = await reserveExplanation(owner, id, 1);
  expect(claim.kind).toBe('claimed');
  expect((await reserveExplanation(owner, id, 1)).kind).toBe('pending');
  if (claim.kind !== 'claimed') throw new Error('Missing claim');
  await failExplanation(owner, claim.requestKey);
  expect((await reserveExplanation(owner, id, 1)).kind).toBe('claimed');
  await database.exec(
    `INSERT INTO writing.explanation_requests(id, user_id) SELECT gen_random_uuid(), '${owner}' FROM generate_series(1, 57)`,
  );
  await expect(reserveExplanation(owner, id, 2)).rejects.toThrow('EXPLANATION_LIMIT');
  expect((await reserveExplanation(owner, id, 0)).kind).toBe('completed');
});
