import { NextResponse } from 'next/server';
import { ApiError, apiFailure, readJson, requireApiUser } from '@/lib/api';
import { reportInput } from '@/lib/feedback/choices';
import { reportCorrection } from '@/lib/db/corrections';
export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const parsed = reportInput.safeParse(await readJson(request));
    if (!parsed.success) throw new ApiError('INVALID_INPUT', 400);
    const { submissionId, correctionIndex, reason } = parsed.data;
    await reportCorrection(user.id, submissionId, correctionIndex, reason);
    return NextResponse.json(
      { ok: true, reason },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return apiFailure(
      error instanceof Error && error.message === 'NOT_FOUND'
        ? new ApiError('NOT_FOUND', 404)
        : error,
    );
  }
}
