import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiFailure, ApiError, requireApiUser } from '@/lib/api';
import { loadRevision } from '@/lib/db/portfolio';
export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    const id = z.uuid().safeParse(new URL(request.url).searchParams.get('submissionId'));
    if (!id.success) throw new ApiError('INVALID_INPUT', 400);
    const data = await loadRevision(user.id, id.data);
    if (!data) throw new ApiError('NOT_FOUND', 404);
    return NextResponse.json(
      { ok: true, data },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
