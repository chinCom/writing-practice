import { NextResponse } from 'next/server';
import { apiFailure, ApiError, requireApiUser } from '@/lib/api';
import { loadPortfolio } from '@/lib/db/portfolio';
export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    const raw = new URL(request.url).searchParams.get('offset') ?? '0';
    if (!/^\d{1,6}$/.test(raw)) throw new ApiError('INVALID_INPUT', 400);
    return NextResponse.json(
      { ok: true, data: await loadPortfolio(user.id, Number(raw)) },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
