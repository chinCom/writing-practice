import { NextResponse } from 'next/server';
import { ApiError, apiFailure, readJson, requireApiUser } from '@/lib/api';
import { preferencesInput } from '@/lib/preferences';
import { loadPreferences, savePreferences } from '@/lib/db/preferences';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    return NextResponse.json({ ok: true, ...(await loadPreferences(user.id)) }, { headers });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function PUT(request: Request) {
  try {
    const user = await requireApiUser(request);
    const parsed = preferencesInput.safeParse(await readJson(request));
    if (!parsed.success) throw new ApiError('INVALID_INPUT', 400);
    await savePreferences(user.id, parsed.data.weeklyGoal);
    return NextResponse.json({ ok: true, ...parsed.data }, { headers });
  } catch (error) {
    return apiFailure(error);
  }
}
