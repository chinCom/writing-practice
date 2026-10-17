import { NextResponse } from 'next/server';
import { apiFailure, ApiError, readJson, requireApiUser } from '@/lib/api';
import { developmentInput, parseDevelopmentInput } from '@/lib/feedback/development';
import { loadTask } from '@/lib/db/curriculum';
import { reserveDevelopment } from '@/lib/db/explanations';
import { developWriting } from '@/lib/llm/develop';
import { LlmError } from '@/lib/llm/grade';

export const maxDuration = 30;
export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const input = developmentInput.safeParse(await readJson(request));
    if (!input.success) throw new ApiError('INVALID_INPUT', 400);
    const task = await loadTask(user.id, input.data.taskId);
    let text: string;
    try {
      text = parseDevelopmentInput(input.data, task).text;
    } catch {
      throw new ApiError('INVALID_INPUT', 400);
    }
    if (!process.env.DEEPSEEK_API_KEY) throw new ApiError('NOT_CONFIGURED', 503);
    const { level } = await reserveDevelopment(user.id, task.targetLevel);
    const result = await developWriting(text, level, task, {
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
      model: process.env.DEEPSEEK_MODEL ?? 'deepseek-v4.1-flash-1017',
      mock: false,
    });
    // No submission, score, lesson progress, practice card or generated writing is saved.
    return NextResponse.json(
      { ok: true, data: result.data, mock: false },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    if (error instanceof LlmError)
      return apiFailure(
        new ApiError(
          error.message === 'LLM_TIMEOUT' ? 'DEVELOPMENT_TIMEOUT' : 'DEVELOPMENT_UNAVAILABLE',
          502,
        ),
      );
    if (error instanceof Error && error.message === 'EXPLANATION_LIMIT')
      return apiFailure(new ApiError('DEVELOPMENT_LIMIT', 429));
    return apiFailure(error);
  }
}
