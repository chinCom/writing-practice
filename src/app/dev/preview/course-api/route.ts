import { NextResponse } from 'next/server';
import { z } from 'zod';
import { coursePreview } from '@/mocks/course-preview';
import { gradeWarmup } from '@/lib/curriculum';
import { parseFeedbackInput } from '@/lib/feedback/input';
import { readJson } from '@/lib/api';
export async function GET() {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 });
  return NextResponse.json({ ok: true, path: (await coursePreview()).path });
}
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 });
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== (request.headers.get('host') ?? new URL(request.url).host))
    return new Response(null, { status: 403 });
  try {
    const body = z
      .object({
        lessonId: z.string().optional(),
        taskId: z.string().optional(),
        index: z.number().int().min(0).max(5).optional(),
        answer: z.string().max(300).optional(),
        text: z.string().max(6500).optional(),
        attempt: z.number().optional(),
        parentSubmissionId: z.string().optional(),
      })
      .parse(await readJson(request));
    const { state, lessons, path } = await coursePreview();
    const index = lessons.findIndex((item) =>
      body.lessonId ? item.id === body.lessonId : item.task.id === body.taskId,
    );
    const lesson = lessons[index];
    const publicItem = path.units
      .flatMap((unit) => unit.lessons)
      .find((item) => item.id === lesson?.id);
    if (!lesson || publicItem?.state === 'locked') return new Response(null, { status: 403 });
    let result;
    if (body.lessonId) {
      const warmup = lesson.warmups[body.index ?? -1];
      if (!warmup || body.answer === undefined) return new Response(null, { status: 400 });
      const correct = gradeWarmup(warmup, body.answer);
      if (correct) state.warmups[index + ':' + body.index] = true;
      result = { ok: true, correct, hint: correct ? null : warmup.hint };
    } else {
      if (!publicItem?.warmupsDone) return new Response(null, { status: 403 });
      parseFeedbackInput(
        {
          taskId: body.taskId,
          text: body.text,
          attempt: body.attempt ?? 1,
          parentSubmissionId: body.parentSubmissionId,
        },
        lesson.task.targetLevel,
        lesson.task,
      );
      if (!state.written.includes(index)) state.written.push(index);
      result = { ok: true, data: { status: 'completed', submissionId: 'preview' } };
    }
    const response = NextResponse.json(result);
    response.cookies.set('course-preview', JSON.stringify(state), {
      httpOnly: true,
      sameSite: 'strict',
      path: '/dev/preview',
      maxAge: 86400,
    });
    return response;
  } catch {
    return NextResponse.json({ ok: false, error: { code: 'INVALID_INPUT' } }, { status: 400 });
  }
}
