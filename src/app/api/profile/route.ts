import { NextResponse } from 'next/server';
import { ApiError, apiFailure, readJson, requireApiUser } from '@/lib/api';
import { profileInput } from '@/lib/profile';
import { loadProfile, saveProfile } from '@/lib/db/profile';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    return NextResponse.json({ ok: true, profile: await loadProfile(user.id) }, { headers });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function PUT(request: Request) {
  try {
    const user = await requireApiUser(request);
    const parsed = profileInput.safeParse(await readJson(request));
    if (!parsed.success) throw new ApiError('INVALID_INPUT', 400);
    await saveProfile(user.id, parsed.data);
    return NextResponse.json({ ok: true, profile: parsed.data }, { headers });
  } catch (error) {
    return apiFailure(error);
  }
}
