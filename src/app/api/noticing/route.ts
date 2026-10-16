import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser, readJson, ApiError, apiFailure } from '@/lib/api';
import { answerNoticing } from '@/lib/db/curriculum';
export const noticingInput = z.strictObject({
  lessonId: z.string().regex(/^[a-z0-9-]{1,80}$/),
  selected: z
    .array(
      z.strictObject({
        start: z.number().int().min(0).max(6500),
        end: z.number().int().min(1).max(6500),
      }),
    )
    .max(6),
});
export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const input = noticingInput.safeParse(await readJson(request));
    if (!input.success) throw new ApiError('INVALID_INPUT', 400);
    return NextResponse.json(
      { ok: true, ...(await answerNoticing(user.id, input.data.lessonId, input.data.selected)) },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
