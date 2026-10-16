import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, apiFailure, readJson, requireApiUser } from '@/lib/api';
import { answerTransfer, loadTransfer } from '@/lib/db/transfer';
const input = z.strictObject({
  unitId: z.string().min(1).max(80),
  itemId: z.string().min(1).max(80),
  answer: z.string().trim().min(1).max(300),
  version: z.number().int().min(0).max(100000),
});
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    return NextResponse.json({ ok: true, ...(await loadTransfer(user.id)) }, { headers });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const parsed = input.safeParse(await readJson(request));
    if (!parsed.success) throw new ApiError('INVALID_INPUT', 400);
    const { unitId, itemId, answer, version } = parsed.data;
    return NextResponse.json(
      { ok: true, result: await answerTransfer(user.id, unitId, itemId, answer, version) },
      { headers },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
