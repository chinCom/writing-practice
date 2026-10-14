import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, apiFailure, readJson, requireApiUser } from '@/lib/api';
import { answerPractice, loadPractice } from '@/lib/db/practice';

const answerInput = z.strictObject({
  drillId: z.uuid(),
  answer: z.string().trim().min(1).max(300),
  version: z.number().int().min(0).max(100000),
});
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    return NextResponse.json({ ok: true, ...(await loadPractice(user.id)) }, { headers });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const parsed = answerInput.safeParse(await readJson(request));
    if (!parsed.success) throw new ApiError('INVALID_INPUT', 400);
    const { drillId, answer, version } = parsed.data;
    const result = await answerPractice(user.id, drillId, answer, version);
    return NextResponse.json({ ok: true, result }, { headers });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND')
      return apiFailure(new ApiError('NOT_FOUND', 404));
    if (error instanceof Error && error.message === 'PRACTICE_CONFLICT')
      return apiFailure(new ApiError('PRACTICE_CONFLICT', 409));
    return apiFailure(error);
  }
}
