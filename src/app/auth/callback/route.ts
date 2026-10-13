import { NextResponse } from 'next/server';
import { authClient } from '@/lib/auth/server';
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const client = await authClient();
  if (code && client) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL('/today', url.origin));
  }
  return NextResponse.redirect(new URL('/login?error=callback', url.origin));
}
