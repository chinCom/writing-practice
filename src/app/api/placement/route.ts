import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser, readJson, ApiError, apiFailure } from '@/lib/api';
import { curriculumLevel, placementInput } from '@/lib/curriculum';
import {
  loadPath,
  reservePlacement,
  completePlacement,
  failPlacement,
  choosePlacement,
} from '@/lib/db/curriculum';
import { estimatePlacement } from '@/lib/llm/placement';
import { LlmError } from '@/lib/llm/grade';
const headers = { 'Cache-Control': 'private, no-store' };
export const maxDuration = 60;
export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    const path = await loadPath(user.id);
    return NextResponse.json(
      { ok: true, result: path.placement, chosenLevel: path.chosenLevel },
      { headers },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
export async function PUT(request: Request) {
  try {
    const user = await requireApiUser(request);
    const input = z.strictObject({ level: curriculumLevel }).safeParse(await readJson(request));
    if (!input.success) throw new ApiError('INVALID_INPUT', 400);
    return NextResponse.json(
      { ok: true, ...(await choosePlacement(user.id, input.data.level)) },
      { headers },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request: Request) {
  let owner: string | undefined;
  try {
    const user = await requireApiUser(request);
    const input = placementInput.safeParse(await readJson(request));
    if (!input.success) throw new ApiError('INVALID_INPUT', 400);
    if (!process.env.DEEPSEEK_API_KEY && process.env.USE_MOCK_LLM !== 'true')
      throw new ApiError('COACH_NOT_CONFIGURED', 503);
    await reservePlacement(user.id);
    owner = user.id;
    const result = await estimatePlacement(input.data, {
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
      model: process.env.DEEPSEEK_MODEL ?? 'deepseek-v4.1-flash-1017',
      mock: process.env.USE_MOCK_LLM === 'true',
    });
    await completePlacement(user.id, result);
    return NextResponse.json(
      { ok: true, result, mock: process.env.USE_MOCK_LLM === 'true' },
      { headers },
    );
  } catch (error) {
    if (owner) await failPlacement(owner).catch(() => undefined);
    return apiFailure(
      error instanceof LlmError
        ? new ApiError(error.message === 'LLM_TIMEOUT' ? 'COACH_TIMEOUT' : 'COACH_UNAVAILABLE', 502)
        : error,
    );
  }
}
