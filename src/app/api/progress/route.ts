import { NextResponse } from 'next/server';
import { apiFailure, requireApiUser } from '@/lib/api';
import { loadProgress } from '@/lib/db/progress';

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    return NextResponse.json(
      { ok: true, data: await loadProgress(user.id) },
      {
        headers: { 'Cache-Control': 'private, no-store' },
      },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
