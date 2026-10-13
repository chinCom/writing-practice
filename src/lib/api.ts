import 'server-only';
import { NextResponse } from 'next/server';
import { authConfigured } from '@/lib/auth/config';
import { currentUser } from '@/lib/auth/server';
export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
  }
}
export function apiFailure(error: unknown) {
  const known = error instanceof ApiError;
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: known ? error.code : 'SERVER_ERROR',
        message: known ? error.code : 'Request could not be completed.',
      },
    },
    { status: known ? error.status : 500 },
  );
}
export async function requireApiUser(request: Request) {
  if (!authConfigured() || !process.env.DATABASE_URL) throw new ApiError('NOT_CONFIGURED', 503);
  const origin = request.headers.get('origin');
  if (origin) {
    let source: URL;
    try {
      source = new URL(origin);
    } catch {
      throw new ApiError('FORBIDDEN', 403);
    }
    const destination = new URL(request.url);
    // Next.js can normalize a loopback URL to localhost. Host retains the browser authority.
    const host = request.headers.get('host') ?? destination.host;
    if (source.host !== host || source.protocol !== destination.protocol) {
      throw new ApiError('FORBIDDEN', 403);
    }
  }
  const user = await currentUser();
  if (!user) throw new ApiError('UNAUTHENTICATED', 401);
  return user;
}
export async function readJson(request: Request) {
  const body = await request.text();
  if (body.length > 20000) throw new ApiError('INVALID_INPUT', 400);
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new ApiError('INVALID_INPUT', 400);
  }
}
