import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { apiFailure, ApiError, readJson, requireApiUser } from '@/lib/api';
import { parseFeedbackInput } from '@/lib/feedback/input';
import { locateCorrections } from '@/lib/feedback/locate';
import {
  claimSubmission,
  completeSubmission,
  failSubmission,
  loadCheck,
  loadFeedback,
  reserveSubmission,
} from '@/lib/db/queries';
import { gradeWriting, LlmError } from '@/lib/llm/grade';

export const maxDuration = 90;
const privateHeaders = { 'Cache-Control': 'private, no-store' };
function checkKey(value: string | null) {
  if (!value || !z.uuid().safeParse(value).success) throw new ApiError('INVALID_INPUT', 400);
  return value;
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
  let submissionId: string | undefined;
  let userId: string | undefined;
  let claimed = false;
  const started = Date.now();
  try {
    const user = await requireApiUser(request);
    userId = user.id;
    let input;
    try {
      input = parseFeedbackInput(await readJson(request));
    } catch {
      throw new ApiError('INVALID_INPUT', 400);
    }
    const requestKey = request.headers.has('Idempotency-Key')
      ? checkKey(request.headers.get('Idempotency-Key'))
      : randomUUID();
    if (!process.env.DEEPSEEK_API_KEY && process.env.USE_MOCK_LLM !== 'true')
      throw new ApiError('COACH_NOT_CONFIGURED', 503);
    try {
      submissionId = await reserveSubmission(user.id, input, requestKey);
    } catch (error) {
      if (error instanceof Error) {
        const errors: Record<string, number> = {
          DAILY_LIMIT: 429,
          INVALID_PARENT: 400,
          CHECK_CONFLICT: 409,
          CHECK_IN_PROGRESS: 409,
        };
        if (errors[error.message]) throw new ApiError(error.message, errors[error.message]);
      }
      throw error;
    }
    const previous = await loadCheck(user.id, requestKey);
    if (previous?.status === 'completed') {
      const saved = await loadFeedback(user.id, submissionId);
      if (!saved) throw new ApiError('SERVER_ERROR', 500);
      return NextResponse.json(
        { ok: true, data: { submissionId, feedback: saved.feedback.json, status: 'completed' } },
        { headers: privateHeaders },
      );
    }
    if (previous?.status === 'failed') throw new ApiError('COACH_UNAVAILABLE', 502);
    claimed = await claimSubmission(user.id, submissionId);
    if (!claimed) {
      return NextResponse.json(
        { ok: true, data: { submissionId, status: 'pending' } },
        { status: 202, headers: { ...privateHeaders, 'Retry-After': '3' } },
      );
    }
    const result = await gradeWriting(input.text, {
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
      model: process.env.DEEPSEEK_MODEL ?? 'deepseek-flash',
      mock: process.env.USE_MOCK_LLM === 'true',
    });
    const feedback = {
      ...result.data,
      corrections: locateCorrections(input.text, result.data.corrections),
    };
    await completeSubmission(user.id, submissionId, feedback, result);
    return NextResponse.json(
      { ok: true, data: { submissionId, feedback, mock: result.mock, status: 'completed' } },
      { headers: privateHeaders },
    );
  } catch (error) {
    if (claimed && submissionId && userId)
      await failSubmission(userId, submissionId).catch(() => undefined);
    // Never log writing, account identity, credentials, or provider response bodies.
    console.warn('coach_check_failed', {
      code: error instanceof LlmError || error instanceof ApiError ? error.message : 'SERVER_ERROR',
      elapsedMs: Date.now() - started,
    });
    return apiFailure(
      error instanceof LlmError
        ? new ApiError(error.message === 'LLM_TIMEOUT' ? 'COACH_TIMEOUT' : 'COACH_UNAVAILABLE', 502)
        : error,
    );
  }
}
