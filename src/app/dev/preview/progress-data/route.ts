import { NextResponse } from 'next/server';
import { progressSample, progressEmptySample } from '@/mocks/progress.sample';
export function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 });
  return NextResponse.json(
    {
      ok: true,
      data:
        new URL(request.url).searchParams.get('variant') === 'empty'
          ? progressEmptySample
          : progressSample,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
