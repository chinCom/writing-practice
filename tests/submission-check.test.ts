import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST, maxDuration } from '@/app/api/feedback/route';
import { checkSubmission, SubmissionCheckError } from '@/lib/feedback/check-submission';
import { LlmError } from '@/lib/llm/grade';
import { weekendTask } from '@/lib/curriculum';
import type { FeedbackInput } from '@/lib/feedback/input';
import { locateFeedback } from '@/lib/targets';
import { markedPageSample } from '@/mocks/markedPage.sample';
import { sampleDraft } from '@/mocks/draft.sample';

const database = vi.hoisted(() => ({
  reserveSubmission: vi.fn(),
  loadCheck: vi.fn(),
  loadFeedback: vi.fn(),
  claimSubmission: vi.fn(),
  completeSubmission: vi.fn(),
  failSubmission: vi.fn(),
}));
const dependencies = vi.hoisted(() => ({
  gradeWriting: vi.fn(),
  loadTaskContext: vi.fn(),
  currentUser: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/queries', () => database);
vi.mock('@/lib/db/curriculum', () => ({ loadTaskContext: dependencies.loadTaskContext }));
vi.mock('@/lib/auth/config', () => ({ authConfigured: () => true }));
vi.mock('@/lib/auth/server', () => ({ currentUser: dependencies.currentUser }));
vi.mock('@/lib/llm/grade', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/llm/grade')>()),
  gradeWriting: dependencies.gradeWriting,
}));

const userId = '00000000-0000-4000-8000-000000000001';
const submissionId = '00000000-0000-4000-8000-000000000002';
const requestKey = '00000000-0000-4000-8000-000000000003';
const input: FeedbackInput = { taskId: 'weekend', text: sampleDraft, attempt: 1 };
const context = { task: weekendTask, targets: ['verb-tense' as const] };
const gradeResult = {
  data: markedPageSample,
  usage: { promptTokens: 100, completionTokens: 50, cacheHitTokens: 10 },
  model: 'test-model',
  latencyMs: 12,
  mock: false,
};
const savedFeedback = locateFeedback(sampleDraft, markedPageSample);

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('DATABASE_URL', 'test-only');
  vi.stubEnv('DEEPSEEK_API_KEY', 'test-key');
  vi.stubEnv('USE_MOCK_LLM', 'false');
  vi.stubEnv('DEEPSEEK_BASE_URL', undefined);
  vi.stubEnv('DEEPSEEK_MODEL', undefined);
  vi.stubEnv('GROWTH_TARGETS', 'true');
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  database.reserveSubmission.mockResolvedValue(submissionId);
  database.loadCheck.mockResolvedValue({ id: submissionId, status: 'pending' });
  database.loadFeedback.mockResolvedValue({ feedback: { json: savedFeedback } });
  database.claimSubmission.mockResolvedValue(true);
  database.completeSubmission.mockResolvedValue(undefined);
  database.failSubmission.mockResolvedValue(undefined);
  dependencies.gradeWriting.mockResolvedValue(gradeResult);
  dependencies.loadTaskContext.mockResolvedValue(context);
  dependencies.currentUser.mockResolvedValue({ id: userId });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function check() {
  return checkSubmission(userId, input, requestKey, context);
}
function request(body: unknown = input, key: string | undefined = requestKey) {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (key !== undefined) headers.set('Idempotency-Key', key);
  return new Request('http://localhost/api/feedback', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

describe('submission orchestration', () => {
  it('reserves and claims before grading, then persists located feedback and usage before returning', async () => {
    let finishPersistence: () => void = () => {};
    const persisting = new Promise<void>((resolve) => {
      finishPersistence = resolve;
    });
    database.completeSubmission.mockReturnValue(persisting);
    const result = check();
    await vi.waitFor(() => expect(database.completeSubmission).toHaveBeenCalledOnce());
    expect(database.reserveSubmission).toHaveBeenCalledWith(userId, input, requestKey);
    expect(database.claimSubmission).toHaveBeenCalledWith(userId, submissionId);
    expect(dependencies.gradeWriting).toHaveBeenCalledWith(sampleDraft, {
      apiKey: 'test-key',
      baseURL: 'https://api.deepseek.com',
      model: 'deepseek-flash',
      mock: false,
      ...context,
    });
    expect(database.reserveSubmission.mock.invocationCallOrder[0]).toBeLessThan(
      database.claimSubmission.mock.invocationCallOrder[0],
    );
    expect(database.claimSubmission.mock.invocationCallOrder[0]).toBeLessThan(
      dependencies.gradeWriting.mock.invocationCallOrder[0],
    );
    let completed = false;
    void result.then(() => {
      completed = true;
    });
    await Promise.resolve();
    expect(completed).toBe(false);
    finishPersistence();
    const completedResult = await result;
    expect(completedResult).toMatchObject({ submissionId, status: 'completed', mock: false });
    if (completedResult.status !== 'completed') throw new Error('Expected completed feedback');
    expect(completedResult.feedback.corrections[0]).toMatchObject({
      original: 'go',
      start: sampleDraft.indexOf('go'),
      end: sampleDraft.indexOf('go') + 2,
    });
    expect(completedResult.feedback.target_report).toEqual([
      { tag: 'verb-tense', uses: 3, errors: 3, correction_indexes: [0, 1, 2] },
    ]);
    expect(database.completeSubmission).toHaveBeenCalledWith(
      userId,
      submissionId,
      completedResult.feedback,
      gradeResult,
    );
    expect(database.failSubmission).not.toHaveBeenCalled();
  });

  it('returns pending without grading or cleanup when another worker owns the claim', async () => {
    database.claimSubmission.mockResolvedValue(false);
    expect(await check()).toEqual({ submissionId, status: 'pending' });
    expect(dependencies.gradeWriting).not.toHaveBeenCalled();
    expect(database.completeSubmission).not.toHaveBeenCalled();
    expect(database.failSubmission).not.toHaveBeenCalled();
  });

  it('replays saved feedback without claiming, grading, or inventing a mock field', async () => {
    database.loadCheck.mockResolvedValue({ id: submissionId, status: 'completed' });
    expect(await check()).toEqual({ submissionId, status: 'completed', feedback: savedFeedback });
    expect(database.loadFeedback).toHaveBeenCalledWith(userId, submissionId);
    expect(database.claimSubmission).not.toHaveBeenCalled();
    expect(dependencies.gradeWriting).not.toHaveBeenCalled();
    expect(database.completeSubmission).not.toHaveBeenCalled();
  });

  it('keeps saved target reports hidden when the growth gate is off', async () => {
    vi.stubEnv('GROWTH_TARGETS', 'false');
    database.loadCheck.mockResolvedValue({ id: submissionId, status: 'completed' });
    database.loadFeedback.mockResolvedValue({
      feedback: { json: { ...savedFeedback, target_report: [{ tag: 'verb-tense', uses: 3 }] } },
    });
    const result = await check();
    if (result.status !== 'completed') throw new Error('Expected replayed feedback');
    expect(result.feedback).not.toHaveProperty('target_report');
    expect(dependencies.gradeWriting).not.toHaveBeenCalled();
  });

  it.each([
    { status: 'failed', code: 'COACH_FAILED' },
    { status: 'completed', code: 'SERVER_ERROR' },
  ])('does not claim or clean up a $status replay failure', async ({ status, code }) => {
    database.loadCheck.mockResolvedValue({ id: submissionId, status });
    database.loadFeedback.mockResolvedValue(null);
    await expect(check()).rejects.toMatchObject({ code });
    expect(database.claimSubmission).not.toHaveBeenCalled();
    expect(database.failSubmission).not.toHaveBeenCalled();
    expect(dependencies.gradeWriting).not.toHaveBeenCalled();
  });

  it.each(['DAILY_LIMIT', 'INVALID_PARENT', 'CHECK_CONFLICT', 'CHECK_IN_PROGRESS'])(
    'preserves reservation rejection %s without touching a claim',
    async (code) => {
      database.reserveSubmission.mockRejectedValue(new Error(code));
      await expect(check()).rejects.toBeInstanceOf(SubmissionCheckError);
      expect(database.loadCheck).not.toHaveBeenCalled();
      expect(database.claimSubmission).not.toHaveBeenCalled();
      expect(database.failSubmission).not.toHaveBeenCalled();
      expect(dependencies.gradeWriting).not.toHaveBeenCalled();
    },
  );

  it('does not reserve even a replay when the coach is not configured', async () => {
    vi.stubEnv('DEEPSEEK_API_KEY', '');
    database.loadCheck.mockResolvedValue({ id: submissionId, status: 'completed' });
    await expect(check()).rejects.toMatchObject({ code: 'COACH_NOT_CONFIGURED' });
    expect(database.reserveSubmission).not.toHaveBeenCalled();
  });

  it('supports explicit mock mode and preserves configured provider options', async () => {
    vi.stubEnv('DEEPSEEK_API_KEY', '');
    vi.stubEnv('USE_MOCK_LLM', 'true');
    vi.stubEnv('DEEPSEEK_BASE_URL', 'https://provider.example.test');
    vi.stubEnv('DEEPSEEK_MODEL', 'configured-model');
    dependencies.gradeWriting.mockResolvedValue({ ...gradeResult, mock: true });
    expect(await check()).toMatchObject({ status: 'completed', mock: true });
    expect(dependencies.gradeWriting).toHaveBeenCalledWith(sampleDraft, {
      apiKey: '',
      baseURL: 'https://provider.example.test',
      model: 'configured-model',
      mock: true,
      ...context,
    });
  });

  it('propagates database lookup failures unchanged without marking an unclaimed check failed', async () => {
    const error = Object.assign(new Error('Database deadline'), { code: 'DATABASE_TIMEOUT' });
    database.loadCheck.mockRejectedValue(error);
    await expect(check()).rejects.toBe(error);
    expect(database.claimSubmission).not.toHaveBeenCalled();
    expect(database.failSubmission).not.toHaveBeenCalled();
    expect(dependencies.gradeWriting).not.toHaveBeenCalled();
  });

  it.each(['provider', 'persistence', 'cleanup'])(
    'preserves the original %s failure after claiming',
    async (stage) => {
      const error = new Error('Original operation failure');
      if (stage === 'persistence') database.completeSubmission.mockRejectedValue(error);
      else dependencies.gradeWriting.mockRejectedValue(error);
      if (stage === 'cleanup')
        database.failSubmission.mockRejectedValue(new Error('Cleanup failed'));
      await expect(check()).rejects.toBe(error);
      expect(database.failSubmission).toHaveBeenCalledExactlyOnceWith(userId, submissionId);
      expect(dependencies.gradeWriting).toHaveBeenCalledOnce();
    },
  );
});

describe('feedback HTTP contract', () => {
  it('returns private pending responses with the existing retry hint and duration', async () => {
    database.claimSubmission.mockResolvedValue(false);
    const response = await POST(request());
    expect(maxDuration).toBe(90);
    expect(response.status).toBe(202);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('retry-after')).toBe('3');
    expect(await response.json()).toEqual({ ok: true, data: { submissionId, status: 'pending' } });
    expect(dependencies.gradeWriting).not.toHaveBeenCalled();
  });

  it('uses the verified owner and normalizes writing before reservation', async () => {
    const response = await POST(request({ ...input, text: '  ' + sampleDraft + '  ' }));
    expect(response.status).toBe(200);
    expect(response.headers.get('retry-after')).toBeNull();
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(database.reserveSubmission).toHaveBeenCalledWith(userId, input, requestKey);
    expect(await response.json()).toMatchObject({
      ok: true,
      data: { submissionId, status: 'completed', mock: false },
    });
  });

  it.each([
    ['DAILY_LIMIT', 429],
    ['INVALID_PARENT', 400],
    ['CHECK_CONFLICT', 409],
    ['CHECK_IN_PROGRESS', 409],
  ] as const)('keeps the %s reservation error response', async (code, status) => {
    database.reserveSubmission.mockRejectedValue(new Error(code));
    const response = await POST(request());
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ ok: false, error: { code, message: code } });
  });

  it.each([
    ['LLM_TIMEOUT', 'COACH_TIMEOUT'],
    ['LLM_INVALID_RESPONSE', 'COACH_INVALID_RESPONSE'],
    ['LLM_UNAVAILABLE', 'COACH_UNAVAILABLE'],
  ])('keeps the %s provider error response and claimed-check cleanup', async (failure, code) => {
    dependencies.gradeWriting.mockRejectedValue(new LlmError(failure));
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, error: { code, message: code } });
    expect(database.failSubmission).toHaveBeenCalledExactlyOnceWith(userId, submissionId);
  });

  it('keeps database deadline responses recoverable without exposing internal details', async () => {
    database.loadCheck.mockRejectedValue(
      Object.assign(new Error('Private database details'), { code: 'DATABASE_TIMEOUT' }),
    );
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe('2');
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: 'DATABASE_TIMEOUT', message: 'Request could not be completed. Try again.' },
    });
    expect(database.failSubmission).not.toHaveBeenCalled();
  });

  it('does not reserve writing for an unauthenticated request', async () => {
    dependencies.currentUser.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(dependencies.loadTaskContext).not.toHaveBeenCalled();
    expect(database.reserveSubmission).not.toHaveBeenCalled();
  });

  it.each([
    { body: { ...input, userId: 'forged-owner' }, key: requestKey },
    { body: { ...input, attempt: 2 }, key: requestKey },
    { body: input, key: 'invalid-key' },
  ])('rejects invalid input before reservation', async ({ body, key }) => {
    expect((await POST(request(body, key))).status).toBe(400);
    expect(database.reserveSubmission).not.toHaveBeenCalled();
  });

  it('keeps status lookup read-only with respect to provider calls and reservations', async () => {
    const response = await GET(
      new Request('http://localhost/api/feedback?requestKey=' + requestKey),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({ ok: true, data: { submissionId, status: 'pending' } });
    expect(database.reserveSubmission).not.toHaveBeenCalled();
    expect(dependencies.gradeWriting).not.toHaveBeenCalled();
  });
});
