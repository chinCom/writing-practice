import { NextResponse } from 'next/server';
import { progressSample } from '@/mocks/progress.sample';
export function GET() {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 });
  return NextResponse.json(
    { ok: true, data: progressSample },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
