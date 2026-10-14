import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readJson, ApiError, apiFailure } from '@/lib/api';
import { gradeWarmup } from '@/lib/curriculum';
import { curriculumDraft } from '@/mocks/curriculum-content';

const inputSchema = z.strictObject({
  lessonId: z.string().regex(/^[a-z0-9-]{1,80}$/),
  index: z.number().int().min(0).max(5),
  answer: z.string().max(300),
});

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 });
  try {
    const origin = request.headers.get('origin');
    if (
      origin &&
      new URL(origin).host !== (request.headers.get('host') ?? new URL(request.url).host)
    )
      throw new ApiError('FORBIDDEN', 403);
    const input = inputSchema.safeParse(await readJson(request));
    if (!input.success) throw new ApiError('INVALID_INPUT', 400);
    const lesson = curriculumDraft
      .flatMap((unit) => unit.lessons)
      .find((item) => item.id === input.data.lessonId);
    if (!lesson) throw new ApiError('NOT_FOUND', 404);
    const warmup = lesson.warmups[input.data.index];
    if (!warmup) throw new ApiError('INVALID_INPUT', 400);
    const correct = gradeWarmup(warmup, input.data.answer);
    return NextResponse.json(
      { ok: true, correct, hint: correct ? null : warmup.hint },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
