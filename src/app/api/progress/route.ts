import { NextResponse } from 'next/server';
import { apiFailure, requireApiUser } from '@/lib/api';
import { loadProgress } from '@/lib/db/progress';
import { traceOperation } from '@/lib/observability/server';

export async function GET(request: Request) {
  try {
    const started = performance.now();
    const user = await requireApiUser(request);
    const authenticated = performance.now();
    const data = await traceOperation('progress.load', () => loadProgress(user.id));
    const loaded = performance.now();
    return NextResponse.json(
      { ok: true, data },
      {
        headers: {
          'Cache-Control': 'private, no-store',
          'Server-Timing': `auth;dur=${(authenticated - started).toFixed(1)}, database;dur=${(loaded - authenticated).toFixed(1)}`,
        },
      },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
