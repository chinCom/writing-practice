import { NextResponse } from 'next/server';
export function GET() {
  if (process.env.NODE_ENV !== 'development') return new NextResponse(null, { status: 404 });
  return NextResponse.json({
    ok: true,
    questions: [
      {
        id: '00000000-0000-4000-8000-000000000055',
        version: 0,
        text: 'We swimmed in the sea last weekend.',
        start: 3,
        end: 10,
        original: 'swimmed',
        tag: 'verb-form',
      },
    ],
    nextReviewAt: null,
  });
}
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') return new NextResponse(null, { status: 404 });
  const { answer, version } = await request.json();
  const correct = answer.trim().toLowerCase() === 'swam';
  const complete = correct || version > 0;
  return NextResponse.json({
    ok: true,
    result: {
      correct,
      complete,
      version: version + 1,
      box: correct && !version ? 2 : 1,
      days: complete ? (correct && !version ? 3 : 1) : 0,
      misses: complete ? 0 : 1,
      explanation: 'Use swam for past events.',
      hintTerms: ['swam'],
      ...(complete ? { suggestion: 'swam' } : {}),
    },
  });
}
