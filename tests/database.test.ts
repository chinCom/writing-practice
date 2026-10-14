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
import { reserveExplanation, failExplanation, reserveDevelopment } from '@/lib/db/explanations';
import { POST as developDraft } from '@/app/api/development/route';
import { developWriting } from '@/lib/llm/develop';
vi.mock('@/lib/llm/develop', () => ({ developWriting: vi.fn() }));
import { loadPractice, answerPractice } from '@/lib/db/practice';
import { POST as submitPracticeAnswer } from '@/app/api/practice/route';
import { GET as getProgress } from '@/app/api/progress/route';
import { GET as getPortfolio } from '@/app/api/portfolio/route';
import { GET as getRevision } from '@/app/api/revision/route';
import {
  GET as getCorrectionChoices,
  POST as saveCorrectionChoice,
} from '@/app/api/corrections/route';
import { POST as reportCorrection } from '@/app/api/corrections/report/route';
import { GET as getPreferences, PUT as savePreferences } from '@/app/api/preferences/route';
import WritingPage from '@/app/write/[taskId]/page';
import { GET as getProfile, PUT as saveProfile } from '@/app/api/profile/route';
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
  await database.exec(await readFile('drizzle/0004_practice.sql', 'utf8'));
  await database.exec(await readFile('drizzle/0005_correction_choices.sql', 'utf8'));
  await database.exec(await readFile('drizzle/0006_preferences.sql', 'utf8'));
  await database.exec(await readFile('drizzle/0007_profiles.sql', 'utf8'));
  await database.exec(await readFile('drizzle/0008_curriculum.sql', 'utf8'));
  await database.exec(await readFile('drizzle/0009_writing_course.sql', 'utf8'));
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
it('saves an owner-only learning profile and rejects forged owners and invalid levels', async () => {
  vi.mocked(currentUser).mockResolvedValue({ id: charlie } as NonNullable<
    Awaited<ReturnType<typeof currentUser>>
  >);
  const url = 'http://localhost/api/profile';
  expect(await (await getProfile(new Request(url))).json()).toEqual({ ok: true, profile: null });
  const profile = { nativeLanguage: 'vi', goal: 'general', startingLevel: 'A1', dailyMinutes: 15 };
  const request = (body: unknown, origin = 'http://localhost') =>
    new Request(url, {
      method: 'PUT',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  expect((await saveProfile(request(profile))).status).toBe(200);
  const saved = await getProfile(new Request(url));
  expect(saved.headers.get('cache-control')).toBe('private, no-store');
  expect(await saved.json()).toEqual({ ok: true, profile });
  expect((await saveProfile(request({ ...profile, userId: bob }))).status).toBe(400);
  expect((await saveProfile(request({ ...profile, startingLevel: 'expert' }))).status).toBe(400);
  expect((await saveProfile(request(profile, 'https://evil.example'))).status).toBe(403);
  vi.mocked(currentUser).mockResolvedValue({ id: bob } as NonNullable<
    Awaited<ReturnType<typeof currentUser>>
  >);
  expect(await (await getProfile(new Request(url))).json()).toEqual({ ok: true, profile: null });
  expect((await asUser(bob, 'SELECT * FROM writing.profiles')).rows).toHaveLength(0);
  vi.mocked(currentUser).mockResolvedValue(null);
  expect((await saveProfile(request(profile))).status).toBe(401);
});
it('saves weekly goals privately, rejects invalid inputs, and loads the default for another owner', async () => {
  vi.mocked(currentUser).mockResolvedValue({ id: charlie } as NonNullable<
    Awaited<ReturnType<typeof currentUser>>
  >);
  const request = (body: unknown, origin = 'http://localhost') =>
    new Request('http://localhost/api/preferences', {
      method: 'PUT',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  const initial = await getPreferences(new Request('http://localhost/api/preferences'));
  expect(await initial.json()).toMatchObject({ ok: true, weeklyGoal: 5 });
  expect((await savePreferences(request({ weeklyGoal: 3 }))).status).toBe(200);
  const saved = await getPreferences(new Request('http://localhost/api/preferences'));
  expect(saved.headers.get('cache-control')).toBe('private, no-store');
  expect(await saved.json()).toMatchObject({ weeklyGoal: 3 });
  for (const body of [
    { weeklyGoal: 0 },
    { weeklyGoal: 4 },
    { weeklyGoal: '7' },
    { weeklyGoal: 7, userId: bob },
  ])
    expect((await savePreferences(request(body))).status).toBe(400);
  expect(
    (await savePreferences(request({ weeklyGoal: 7 }, 'https://foreign.example'))).status,
  ).toBe(403);
  vi.mocked(currentUser).mockResolvedValue({ id: bob } as NonNullable<
    Awaited<ReturnType<typeof currentUser>>
  >);
  expect(
    await (await getPreferences(new Request('http://localhost/api/preferences'))).json(),
  ).toMatchObject({ weeklyGoal: 5 });
  expect(
    (await asUser(bob, `SELECT * FROM writing.preferences WHERE user_id = '${charlie}'`)).rows,
  ).toHaveLength(0);
  await expect(
    asUser(bob, `INSERT INTO writing.preferences(user_id,weekly_goal) VALUES ('${charlie}',7)`),
  ).rejects.toThrow();
  vi.mocked(currentUser).mockResolvedValue(null);
  expect((await savePreferences(request({ weeklyGoal: 7 }))).status).toBe(401);
});
it('persists correction choices, excludes dismissed drills, restores reviews, and saves owner-only reports', async () => {
  const owner = '00000000-0000-4000-8000-000000000097';
  await database.exec(`INSERT INTO auth.users VALUES ('${owner}')`);
  const id = await reserveSubmission(owner, { taskId: 'weekend', text: sampleDraft, attempt: 1 });
  const located = {
    ...markedPageSample,
    corrections: [
      {
        ...markedPageSample.corrections[0],
        start: sampleDraft.indexOf('go'),
        end: sampleDraft.indexOf('go') + 2,
      },
    ],
  };
  await completeSubmission(owner, id, located, {
    data: markedPageSample,
    usage: { promptTokens: 1, completionTokens: 1, cacheHitTokens: 0 },
    model: 'test',
    latencyMs: 1,
    mock: true,
  });
  vi.mocked(currentUser).mockResolvedValue({ id: owner } as NonNullable<
    Awaited<ReturnType<typeof currentUser>>
  >);
  const request = (path: string, body: unknown, origin = 'http://localhost') =>
    new Request('http://localhost' + path, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  const payload = { submissionId: id, correctionIndex: 0, status: 'applied' };
  expect((await saveCorrectionChoice(request('/api/corrections', payload))).status).toBe(200);
  const saved = await getCorrectionChoices(
    new Request('http://localhost/api/corrections?submissionId=' + id),
  );
  expect(saved.headers.get('cache-control')).toBe('private, no-store');
  expect(await saved.json()).toMatchObject({
    choices: [{ correctionIndex: 0, status: 'applied' }],
  });
  expect((await loadFeedback(owner, id))?.feedback.json).toEqual(located);
  // The server must transfer saved fixes even when sessionStorage is unavailable.
  const revision = await WritingPage({
    params: Promise.resolve({ taskId: 'weekend' }),
    searchParams: Promise.resolve({ revise: id }),
  });
  expect(revision.props.initialText).toBe(sampleDraft.replace('go', 'went'));
  expect(revision.key).toBe(id);
  const queue = await loadPractice(owner);
  expect(queue.questions).toHaveLength(1);
  expect(
    (await saveCorrectionChoice(request('/api/corrections', { ...payload, status: 'dismissed' })))
      .status,
  ).toBe(200);
  expect((await loadPractice(owner)).questions).toHaveLength(0);
  await expect(answerPractice(owner, queue.questions[0].id, 'went', 0)).rejects.toThrow(
    'PRACTICE_CONFLICT',
  );
  expect(
    (await saveCorrectionChoice(request('/api/corrections', { ...payload, status: 'open' })))
      .status,
  ).toBe(200);
  expect((await loadPractice(owner)).questions).toHaveLength(1);
  expect(
    (
      await reportCorrection(
        request('/api/corrections/report', {
          submissionId: id,
          correctionIndex: 0,
          reason: 'meaning',
        }),
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await reportCorrection(
        request('/api/corrections/report', {
          submissionId: id,
          correctionIndex: 0,
          reason: 'incorrect',
        }),
      )
    ).status,
  ).toBe(200);
  expect((await asUser(owner, 'SELECT reason FROM writing.correction_reports')).rows).toEqual([
    { reason: 'incorrect' },
  ]);
  expect((await asUser(bob, 'SELECT * FROM writing.correction_reports')).rows).toHaveLength(0);
  expect((await asUser(bob, 'SELECT * FROM writing.correction_choices')).rows).toHaveLength(0);
  expect(
    (await saveCorrectionChoice(request('/api/corrections', { ...payload, userId: bob }))).status,
  ).toBe(400);
  expect(
    (
      await reportCorrection(
        request('/api/corrections/report', {
          submissionId: id,
          correctionIndex: 11,
          reason: 'other',
        }),
      )
    ).status,
  ).toBe(404);
  expect(
    (await saveCorrectionChoice(request('/api/corrections', payload, 'https://evil.example')))
      .status,
  ).toBe(403);
  vi.mocked(currentUser).mockResolvedValue({ id: bob } as NonNullable<
    Awaited<ReturnType<typeof currentUser>>
  >);
  expect((await saveCorrectionChoice(request('/api/corrections', payload))).status).toBe(404);
  expect(
    (await getCorrectionChoices(new Request('http://localhost/api/corrections?submissionId=' + id)))
      .status,
  ).toBe(404);
  expect(
    (
      await reportCorrection(
        request('/api/corrections/report', {
          submissionId: id,
          correctionIndex: 0,
          reason: 'other',
        }),
      )
    ).status,
  ).toBe(404);
  vi.mocked(currentUser).mockResolvedValue(null);
  expect((await saveCorrectionChoice(request('/api/corrections', payload))).status).toBe(401);
});
it('backfills only ten unprocessed legacy sources per read and records empty or unsafe feedback', async () => {
  const owner = '00000000-0000-4000-8000-000000000096';
  await database.query('INSERT INTO auth.users VALUES ($1)', [owner]);
  for (let index = 0; index < 100; index++) {
    const id = crypto.randomUUID();
    await database.query(
      "INSERT INTO writing.submissions(id,user_id,task_id,text,word_count,attempt,status) VALUES ($1,$2,'weekend',$3,58,1,'completed')",
      [id, owner, sampleDraft],
    );
    await database.query(
      "INSERT INTO writing.feedback(submission_id,user_id,json,model,prompt_version) VALUES ($1,$2,$3,'test','test')",
      [
        id,
        owner,
        JSON.stringify({ ...markedPageSample, corrections: [], safety_flag: index % 2 === 0 }),
      ],
    );
  }
  expect((await loadPractice(owner)).questions).toHaveLength(0);
  expect((await asUser(owner, 'SELECT * FROM writing.practice_sources')).rows).toHaveLength(10);
  await loadPractice(owner);
  expect((await asUser(owner, 'SELECT * FROM writing.practice_sources')).rows).toHaveLength(20);
  for (let i = 0; i < 9; i++) await loadPractice(owner);
  expect((await asUser(owner, 'SELECT * FROM writing.practice_sources')).rows).toHaveLength(100);
  expect((await asUser(owner, 'SELECT * FROM writing.practice_drills')).rows).toHaveLength(0);
});
it('saves due practice, grades on the server, blocks foreign answers, and reuses repeated results', async () => {
  const owner = '00000000-0000-4000-8000-000000000099';
  await database.exec(`INSERT INTO auth.users VALUES ('${owner}')`);
  const id = await reserveSubmission(owner, { taskId: 'weekend', text: sampleDraft, attempt: 1 });
  await completeSubmission(
    owner,
    id,
    {
      ...markedPageSample,
      corrections: [
        {
          original: 'go',
          suggestion: 'went',
          tag: 'verb-tense',
          severity: 'major',
          explanation: 'Use past tense for last weekend.',
          confidence: 0.99,
          start: sampleDraft.indexOf('go'),
          end: sampleDraft.indexOf('go') + 2,
        },
      ],
    },
    {
      data: markedPageSample,
      usage: { promptTokens: 1, completionTokens: 1, cacheHitTokens: 0 },
      model: 'test',
      latencyMs: 1,
      mock: true,
    },
  );
  // Completing feedback creates drills atomically, without a Practice read.
  expect((await asUser(owner, 'SELECT * FROM writing.practice_drills')).rows).toHaveLength(1);
  const queue = await loadPractice(owner);
  expect(queue.questions).toHaveLength(1);
  const question = queue.questions[0];
  expect(question).not.toHaveProperty('suggestion');
  expect((await loadPractice(owner)).questions[0].id).toBe(question.id);
  await expect(answerPractice(bob, question.id, 'went', 0)).rejects.toThrow('NOT_FOUND');
  const wrong = await answerPractice(owner, question.id, 'goed', 0);
  expect(wrong).toMatchObject({ correct: false, complete: false, version: 1 });
  expect(await answerPractice(owner, question.id, 'goed', 0)).toEqual(wrong);
  await expect(answerPractice(owner, question.id, 'went', 0)).rejects.toThrow('PRACTICE_CONFLICT');
  const retry = await answerPractice(owner, question.id, 'went', 1);
  expect(retry).toMatchObject({ correct: true, complete: true, days: 1, box: 1 });
  expect((await loadPractice(owner)).questions).toHaveLength(0);
  expect((await loadPractice(owner)).nextReviewAt).not.toBeNull();
  expect((await asUser(bob, 'SELECT * FROM writing.practice_drills')).rows).toHaveLength(0);
  expect((await asUser(bob, 'SELECT * FROM writing.practice_answers')).rows).toHaveLength(0);
  await database.query(
    "UPDATE writing.practice_drills SET next_review_at = now() - interval '1 minute' WHERE id = $1",
    [question.id],
  );
  const dueAgain = await loadPractice(owner);
  expect(dueAgain.questions[0]).toMatchObject({ id: question.id, version: 2 });
  expect(await answerPractice(owner, question.id, 'went', 2)).toMatchObject({
    complete: true,
    correct: true,
    box: 2,
    days: 3,
  });
  expect((await loadPractice(owner)).questions).toHaveLength(0);
  vi.mocked(currentUser).mockResolvedValue({ id: owner } as NonNullable<
    Awaited<ReturnType<typeof currentUser>>
  >);
  const request = (body: unknown, origin = 'http://localhost') =>
    new Request('http://localhost/api/practice', {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  expect(
    (
      await submitPracticeAnswer(
        request({ drillId: question.id, answer: 'went', version: 1, userId: bob }),
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await submitPracticeAnswer(
        request({ drillId: question.id, answer: 'went', version: 1 }, 'https://evil.example'),
      )
    ).status,
  ).toBe(403);
  const repeat = await submitPracticeAnswer(
    request({ drillId: question.id, answer: 'went', version: 1 }),
  );
  expect(repeat.status).toBe(200);
  expect(repeat.headers.get('cache-control')).toContain('no-store');
  vi.mocked(currentUser).mockResolvedValue(null);
  expect(
    (await submitPracticeAnswer(request({ drillId: question.id, answer: 'went', version: 1 })))
      .status,
  ).toBe(401);
});
it('returns answer-specific practice hints and preserves them when a save is retried', async () => {
  const owner = '00000000-0000-4000-8000-000000000098';
  await database.exec(`INSERT INTO auth.users VALUES ('${owner}')`);
  const text = 'There were many options that I can choose from. ' + sampleDraft;
  const original = 'I can choose from';
  const id = await reserveSubmission(owner, { taskId: 'weekend', text, attempt: 1 });
  const feedback = {
    ...markedPageSample,
    corrections: [
      {
        original,
        suggestion: 'I could choose from',
        tag: 'verb-tense' as const,
        severity: 'major' as const,
        explanation: 'Use could for ability in the past.',
        confidence: 0.99,
        start: text.indexOf(original),
        end: text.indexOf(original) + original.length,
      },
    ],
  };
  await completeSubmission(owner, id, feedback, {
    data: feedback,
    usage: { promptTokens: 1, completionTokens: 1, cacheHitTokens: 0 },
    model: 'test',
    latencyMs: 1,
    mock: true,
  });
  const { questions } = await loadPractice(owner);
  expect(questions[0]).not.toHaveProperty('suggestion');
  const result = await answerPractice(owner, questions[0].id, 'I could chose from', 0);
  expect(result).toMatchObject({
    correct: false,
    complete: false,
    retryHint: { kind: 'modal-word', modal: 'could', phrase: 'chose', replacement: 'choose' },
  });
  expect(result).not.toHaveProperty('suggestion');
  expect(await answerPractice(owner, questions[0].id, 'I could chose from', 0)).toEqual(result);
  expect(await answerPractice(owner, questions[0].id, 'I could choose from', 1)).toMatchObject({
    correct: true,
    complete: true,
    suggestion: 'I could choose from',
  });
});

it('returns private progress for the verified owner without counting another account or failed checks', async () => {
  vi.mocked(currentUser).mockResolvedValue({
    id: '00000000-0000-4000-8000-000000000099',
  } as NonNullable<Awaited<ReturnType<typeof currentUser>>>);
  const response = await getProgress(new Request('http://localhost/api/progress'));
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toContain('no-store');
  expect(await response.json()).toMatchObject({
    ok: true,
    data: { sessions: 1, words: 58, reviews: 2, correctReviews: 2, xp: 20 },
  });
  vi.mocked(currentUser).mockResolvedValue({ id: bob } as NonNullable<
    Awaited<ReturnType<typeof currentUser>>
  >);
  expect(
    await (await getProgress(new Request('http://localhost/api/progress'))).json(),
  ).toMatchObject({ data: { sessions: 0, words: 0, reviews: 0 } });
  vi.mocked(currentUser).mockResolvedValue(null);
  expect((await getProgress(new Request('http://localhost/api/progress'))).status).toBe(401);
});
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
  expect(await recentSubmissions(bob)).toEqual([
    expect.objectContaining({ id, attempt: 1, taskId: 'weekend' }),
  ]);
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
it('lists and compares only completed owner versions with pagination and private responses', async () => {
  const owner = '00000000-0000-4000-8000-000000000088';
  await database.exec(`INSERT INTO auth.users VALUES ('${owner}')`);
  const originalId = await reserveSubmission(owner, {
    taskId: 'weekend',
    text: sampleDraft,
    attempt: 1,
  });
  const result = {
    data: markedPageSample,
    usage: { promptTokens: 1, completionTokens: 1, cacheHitTokens: 0 },
    model: 'test',
    latencyMs: 1,
    mock: false,
  };
  await completeSubmission(owner, originalId, { ...markedPageSample, corrections: [] }, result);
  const revisedId = await reserveSubmission(owner, {
    taskId: 'weekend',
    text: sampleDraft + ' Bye!',
    attempt: 2,
    parentSubmissionId: originalId,
  });
  await completeSubmission(owner, revisedId, { ...markedPageSample, corrections: [] }, result);
  vi.mocked(currentUser).mockResolvedValue({ id: owner } as NonNullable<
    Awaited<ReturnType<typeof currentUser>>
  >);
  const list = await getPortfolio(new Request('http://localhost/api/portfolio?offset=0'));
  expect(list.headers.get('cache-control')).toBe('private, no-store');
  const entries = (await list.json()).data.entries;
  expect(entries).toHaveLength(2);
  expect(entries[0]).toMatchObject({ id: revisedId, attempt: 2, parentSubmissionId: originalId });
  const comparison = await getRevision(
    new Request('http://localhost/api/revision?submissionId=' + revisedId),
  );
  expect((await comparison.json()).data).toMatchObject({
    current: { id: revisedId, text: sampleDraft + ' Bye!' },
    original: { id: originalId, text: sampleDraft },
  });
  expect((await getPortfolio(new Request('http://localhost/api/portfolio?offset=-1'))).status).toBe(
    400,
  );
  expect(
    (await getRevision(new Request('http://localhost/api/revision?submissionId=' + originalId)))
      .status,
  ).toBe(404);
  vi.mocked(currentUser).mockResolvedValue({ id: bob } as NonNullable<
    Awaited<ReturnType<typeof currentUser>>
  >);
  expect(
    (await getRevision(new Request('http://localhost/api/revision?submissionId=' + revisedId)))
      .status,
  ).toBe(404);
  expect(
    (
      await (await getPortfolio(new Request('http://localhost/api/portfolio'))).json()
    ).data.entries.some((entry: { id: string }) => entry.id === revisedId),
  ).toBe(false);
  vi.mocked(currentUser).mockResolvedValue(null);
  expect((await getPortfolio(new Request('http://localhost/api/portfolio'))).status).toBe(401);
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

it('development accepts short writing privately without creating a submission, and shares the explanation allowance', async () => {
  const owner = '00000000-0000-4000-8000-000000000090';
  const other = '00000000-0000-4000-8000-000000000091';
  await database.query('INSERT INTO auth.users VALUES ($1), ($2)', [owner, other]);
  vi.mocked(currentUser).mockResolvedValue({ id: owner } as NonNullable<
    Awaited<ReturnType<typeof currentUser>>
  >);
  const result = {
    data: {
      encouragement: 'A start.',
      question: 'What did you like?',
      sentence_starter: 'I liked ___.',
      next_step: 'Add a detail.',
      safety_flag: false,
      focus_text: '',
    },
    usage: { promptTokens: 50, completionTokens: 30, cacheHitTokens: 0 },
    model: 'test',
    latencyMs: 10,
    mock: false,
  };
  vi.stubEnv('DEEPSEEK_API_KEY', 'synthetic-test-key');
  vi.mocked(developWriting).mockResolvedValue(result);
  const request = (value: unknown, origin = 'http://localhost') =>
    new Request('http://localhost/api/development', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', origin },
      body: JSON.stringify(value),
    });
  expect((await developDraft(request({ taskId: 'weekend', text: 'I like food.' }))).status).toBe(
    200,
  );
  expect(vi.mocked(developWriting).mock.calls.at(-1)?.slice(0, 3)).toEqual([
    'I like food.',
    'A2',
    expect.objectContaining({ id: 'weekend' }),
  ]);
  expect(
    (
      await database.query<{ total: number }>(
        'SELECT count(*)::int AS total FROM writing.submissions WHERE user_id=$1',
        [owner],
      )
    ).rows[0].total,
  ).toBe(0);
  expect(
    (
      await database.query<{ total: number }>(
        'SELECT count(*)::int AS total FROM writing.explanation_requests WHERE user_id=$1',
        [owner],
      )
    ).rows[0].total,
  ).toBe(1);
  expect((await developDraft(request({ taskId: 'weekend', text: 'hi', level: 'C2' }))).status).toBe(
    400,
  );
  expect(
    (await developDraft(request({ taskId: 'weekend', text: 'hi' }, 'https://evil.example'))).status,
  ).toBe(403);
  expect((await developDraft(request({ taskId: 'unknown', text: 'hi' }))).status).toBe(404);
  await database.query(
    "INSERT INTO writing.placement_results (user_id,status,chosen_level,calls_today,call_day,started_at,updated_at) VALUES ($1,'completed','A1',1,'2026-10-14',now(),now())",
    [owner],
  );
  expect((await developDraft(request({ taskId: 'weekend', text: 'hi' }))).status).toBe(200);
  expect(vi.mocked(developWriting).mock.calls.at(-1)?.[1]).toBe('A1');
  vi.mocked(developWriting).mockRejectedValueOnce(new Error('synthetic provider failure'));
  expect((await developDraft(request({ taskId: 'weekend', text: 'hi' }))).status).toBe(500);
  expect(
    (
      await database.query<{ total: number }>(
        'SELECT count(*)::int AS total FROM writing.explanation_requests WHERE user_id=$1',
        [owner],
      )
    ).rows[0].total,
  ).toBe(3);
  await database.query(
    'INSERT INTO writing.explanation_requests (id,user_id) SELECT gen_random_uuid(), $1 FROM generate_series(1,57)',
    [owner],
  );
  expect((await developDraft(request({ taskId: 'weekend', text: 'hi' }))).status).toBe(429);
  await expect(reserveDevelopment(owner, 'A2')).rejects.toThrow('EXPLANATION_LIMIT');
  expect((await reserveDevelopment(other, 'B1')).level).toBe('B1');
  vi.mocked(currentUser).mockResolvedValue(null);
  expect((await developDraft(request({ taskId: 'weekend', text: 'hi' }))).status).toBe(401);
});
