import { z } from 'zod';
import { NextResponse } from 'next/server';
import { apiFailure, ApiError, readJson, requireApiUser } from '@/lib/api';
import { saveDraft } from '@/lib/db/queries';
const DraftInput = z.strictObject({ text: z.string().max(1200) });
export async function PUT(request: Request) {
  try {
    const user = await requireApiUser(request);
    const input = DraftInput.safeParse(await readJson(request));
    if (!input.success) throw new ApiError('INVALID_INPUT', 400);
    await saveDraft(user.id, input.data.text);
    return NextResponse.json({ ok: true, data: { saved: true } });
  } catch (error) {
    return apiFailure(error);
  }
}
