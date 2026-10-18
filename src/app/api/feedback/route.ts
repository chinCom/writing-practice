import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { apiFailure, ApiError, readJson, requireApiUser } from '@/lib/api';
import { parseFeedbackInput } from '@/lib/feedback/input';
import { checkSubmission, SubmissionCheckError } from '@/lib/feedback/check-submission';
import { loadCheck } from '@/lib/db/queries';
import { LlmError } from '@/lib/llm/errors';
import { loadTaskContext } from '@/lib/db/curriculum';
import { DomainError } from '@/lib/domain-error';

export const maxDuration = 90;
const privateHeaders = { 'Cache-Control': 'private, no-store' };
const submissionErrorStatuses: Record<SubmissionCheckError['code'], number> = {
  DAILY_LIMIT: 429,
  INVALID_PARENT: 400,
  CHECK_CONFLICT: 409,
  CHECK_IN_PROGRESS: 409,
  COACH_NOT_CONFIGURED: 503,
  COACH_FAILED: 502,
  SERVER_ERROR: 500,
};

function checkKey(value: string | null) {
  if (!value || !z.uuid().safeParse(value).success) throw new ApiError('INVALID_INPUT', 400);
  return value;
}
function feedbackApiError(error: unknown) {
  if (error instanceof SubmissionCheckError)
    return new ApiError(error.code, submissionErrorStatuses[error.code]);
  if (error instanceof LlmError) {
    const code =
      error.message === 'LLM_TIMEOUT'
        ? 'COACH_TIMEOUT'
        : error.message === 'LLM_INVALID_RESPONSE'
          ? 'COACH_INVALID_RESPONSE'
          : 'COACH_UNAVAILABLE';
    return new ApiError(code, 502);
  }
  return error;
}
async function checkResponse(userId: string, requestKey: string) {
  const check = await loadCheck(userId, requestKey);
  if (!check) throw new ApiError('NOT_FOUND', 404);
  return NextResponse.json(
    { ok: true, data: { submissionId: check.id, status: check.status } },
    { headers: privateHeaders },
  );
}
export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    return await checkResponse(
      user.id,
      checkKey(new URL(request.url).searchParams.get('requestKey')),
    );
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request: Request) {
  const started = Date.now();
  try {
    const user = await requireApiUser(request);
    const body = await readJson(request);
    const reference = z.object({ taskId: z.string().regex(/^[a-z0-9-]{1,80}$/) }).safeParse(body);
    if (!reference.success) throw new ApiError('INVALID_INPUT', 400);
    const context = await loadTaskContext(user.id, reference.data.taskId);
    let input;
    try {
      input = parseFeedbackInput(body, context.task.targetLevel, context.task);
    } catch {
      throw new ApiError('INVALID_INPUT', 400);
    }
    const requestKey = request.headers.has('Idempotency-Key')
      ? checkKey(request.headers.get('Idempotency-Key'))
      : randomUUID();
    const result = await checkSubmission(user.id, input, requestKey, context);
    return NextResponse.json(
      { ok: true, data: result },
      result.status === 'pending'
        ? { status: 202, headers: { ...privateHeaders, 'Retry-After': '3' } }
        : { headers: privateHeaders },
    );
  } catch (error) {
    // Never log writing, account identity, credentials, or provider response bodies.
    console.warn('coach_check_failed', {
      code:
        error instanceof LlmError ||
        error instanceof ApiError ||
        error instanceof DomainError ||
        error instanceof SubmissionCheckError
          ? error.message
          : 'SERVER_ERROR',
      elapsedMs: Date.now() - started,
    });
    return apiFailure(feedbackApiError(error));
  }
}
