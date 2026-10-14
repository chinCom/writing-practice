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
function databaseTimedOut(error: unknown): boolean {
  const cause = error instanceof Error && error.cause ? error.cause : error;
  if (!cause || typeof cause !== 'object' || !('code' in cause)) return false;
  return ['57014', '55P03', '25P03', 'CONNECT_TIMEOUT', 'DATABASE_TIMEOUT'].includes(
    String(cause.code),
  );
}
export function apiFailure(error: unknown) {
  const known = error instanceof ApiError;
  const timeout = !known && databaseTimedOut(error);
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: known ? error.code : timeout ? 'DATABASE_TIMEOUT' : 'SERVER_ERROR',
        message: known
          ? error.code
          : timeout
            ? 'Request could not be completed. Try again.'
            : 'Request could not be completed.',
      },
    },
    {
      status: known ? error.status : timeout ? 503 : 500,
      headers: { 'Cache-Control': 'private, no-store', ...(timeout ? { 'Retry-After': '2' } : {}) },
    },
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
  if (!request.body || Number(request.headers.get('content-length')) > 20000)
    throw new ApiError('INVALID_INPUT', 400);
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let body = '';
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 20000) {
        await reader.cancel();
        throw new ApiError('INVALID_INPUT', 400);
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new ApiError('INVALID_INPUT', 400);
  }
}
