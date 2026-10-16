import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readJson, apiFailure, ApiError } from '@/lib/api';
import { gradeNoticing } from '@/lib/noticing';
import { noticingSample, noticingAnswer } from '@/mocks/noticing.sample';
import { courseDraft } from '@/mocks/course-content';
const inputSchema = z.strictObject({
  lessonId: z.string().max(80),
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
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 });
  try {
    const origin = request.headers.get('origin');
    if (
      origin &&
      new URL(origin).host !== (request.headers.get('host') ?? new URL(request.url).host)
    )
      throw new ApiError('FORBIDDEN', 403);
    const input = inputSchema.parse(await readJson(request));
    const exercise =
      input.lessonId === noticingSample.id
        ? noticingAnswer
        : courseDraft.flatMap((unit) => unit.lessons).find((lesson) => lesson.id === input.lessonId)
            ?.noticing;
    if (!exercise) throw new ApiError('NOT_FOUND', 404);
    const correct = gradeNoticing(exercise, input.selected);
    return NextResponse.json(
      { ok: true, correct, ...(correct ? { explanation: exercise.explanation } : {}) },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
