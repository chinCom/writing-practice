import { NextResponse } from 'next/server';
import { revisionSample } from '@/mocks/portfolio.sample';
export async function GET() {
  if (process.env.NODE_ENV !== 'development') return new NextResponse(null, { status: 404 });
  return NextResponse.json(
    { ok: true, data: revisionSample },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
