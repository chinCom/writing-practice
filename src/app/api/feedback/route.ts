import { NextResponse } from 'next/server';
import { apiFailure, ApiError, readJson, requireApiUser } from '@/lib/api';
import { parseFeedbackInput } from '@/lib/feedback/input';
import { locateCorrections } from '@/lib/feedback/locate';
import { completeSubmission, failSubmission, reserveSubmission } from '@/lib/db/queries';
import { gradeWriting, LlmError } from '@/lib/llm/grade';
export const maxDuration = 90;
export async function POST(request: Request) {
  let submissionId: string | undefined;
  let userId: string | undefined;
  try {
    const user = await requireApiUser(request);
    userId = user.id;
    let input;
    try {
      input = parseFeedbackInput(await readJson(request));
    } catch {
      throw new ApiError('INVALID_INPUT', 400);
    }
    if (!process.env.DEEPSEEK_API_KEY && process.env.USE_MOCK_LLM !== 'true')
      throw new ApiError('COACH_NOT_CONFIGURED', 503);
    try {
      submissionId = await reserveSubmission(user.id, input);
    } catch (error) {
      if (error instanceof Error && error.message === 'DAILY_LIMIT')
        throw new ApiError('DAILY_LIMIT', 429);
      if (error instanceof Error && error.message === 'INVALID_PARENT')
        throw new ApiError('INVALID_INPUT', 400);
      throw error;
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
    return NextResponse.json({ ok: true, data: { submissionId, feedback, mock: result.mock } });
  } catch (error) {
    if (submissionId && userId) await failSubmission(userId, submissionId).catch(() => undefined);
    return apiFailure(error instanceof LlmError ? new ApiError('COACH_UNAVAILABLE', 502) : error);
  }
}
