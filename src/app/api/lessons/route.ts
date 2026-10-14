import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser, readJson, ApiError, apiFailure } from '@/lib/api';
import { answerWarmup } from '@/lib/db/curriculum';
const inputSchema = z.strictObject({
  lessonId: z.string().regex(/^[a-z0-9-]{1,80}$/),
  index: z.number().int().min(0).max(5),
  answer: z.string().max(300),
});
export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const input = inputSchema.safeParse(await readJson(request));
    if (!input.success) throw new ApiError('INVALID_INPUT', 400);
    const result = await answerWarmup(
      user.id,
      input.data.lessonId,
      input.data.index,
      input.data.answer,
    );
    return NextResponse.json(
      { ok: true, ...result },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
