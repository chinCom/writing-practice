import { NextResponse } from 'next/server';
export function GET() {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 });
  return NextResponse.json({ ok: true, choices: [] });
}
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 });
  const input = await request.json();
  return NextResponse.json({ ok: true, status: input.status, reason: input.reason });
}
