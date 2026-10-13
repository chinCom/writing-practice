import { NextResponse } from 'next/server';
export async function POST() {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 });
  return NextResponse.json(
    {
      ok: true,
      mock: true,
      data: {
        why_original:
          'This is a design preview. The original verb does not match the past time in the sample.',
        why_suggestion:
          'This is a design preview. The suggested verb shows that the sample activity happened before now.',
      },
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
