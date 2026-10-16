import { NextResponse } from 'next/server';
import { z } from 'zod';
import { gradeTransfer } from '@/lib/transfer';
import { ApiError, apiFailure, readJson } from '@/lib/api';
const item = {
  id: 'sample-transfer',
  tag: 'articles' as const,
  prompt: 'Complete: I have ___ apple.',
  answers: ['an'],
  explanation: 'Use an before this vowel sound.',
};
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET() {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 });
  return NextResponse.json(
    {
      ok: true,
      questions: [
        { id: item.id, unitId: 'sample-unit', tag: item.tag, prompt: item.prompt, version: 0 },
      ],
      nextReviewAt: null,
    },
    { headers },
  );
}
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 });
  try {
    const origin = request.headers.get('origin');
    if (
      origin &&
      new URL(origin).host !== (request.headers.get('host') ?? new URL(request.url).host)
    )
      throw new ApiError('FORBIDDEN', 403);
    const input = z
      .strictObject({
        unitId: z.literal('sample-unit'),
        itemId: z.literal(item.id),
        answer: z.string().trim().min(1).max(300),
        version: z.number().int().min(0).max(1),
      })
      .safeParse(await readJson(request));
    if (!input.success) throw new ApiError('INVALID_INPUT', 400);
    return NextResponse.json(
      {
        ok: true,
        result: {
          ...gradeTransfer(item, input.data.answer, 1, input.data.version),
          version: input.data.version + 1,
        },
      },
      { headers },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
