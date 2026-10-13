import { NextResponse } from 'next/server';
import { authClient } from '@/lib/auth/server';

export async function POST(request: Request) {
  const originHeader = request.headers.get('origin');
  if (!originHeader) return new Response(null, { status: 403 });
  let origin: URL;
  try {
    origin = new URL(originHeader);
  } catch {
    return new Response(null, { status: 403 });
  }
  const destination = new URL(request.url);
  const host = request.headers.get('host') ?? destination.host;
  if (origin.host !== host || origin.protocol !== destination.protocol) {
    return new Response(null, { status: 403 });
  }
  const failureUrl = new URL('/login?error=callback', origin);
  if (process.env.GOOGLE_AUTH_ENABLED !== 'true') {
    return NextResponse.redirect(failureUrl, 303);
  }
  try {
    const client = await authClient();
    if (!client) return NextResponse.redirect(failureUrl, 303);
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: new URL('/auth/callback', origin).toString() },
    });
    if (error || !data.url) return NextResponse.redirect(failureUrl, 303);
    return NextResponse.redirect(data.url, 303);
  } catch {
    return NextResponse.redirect(failureUrl, 303);
  }
}
