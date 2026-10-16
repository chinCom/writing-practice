import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, apiFailure, readJson, requireApiUser } from '@/lib/api';
import { choiceInput } from '@/lib/feedback/choices';
import {
  loadCorrectionChoices,
  saveCorrectionChoice,
  revealCorrection,
} from '@/lib/db/corrections';
const headers = { 'Cache-Control': 'private, no-store' };
function failure(error: unknown) {
  return apiFailure(
    error instanceof Error && error.message === 'NOT_FOUND'
      ? new ApiError('NOT_FOUND', 404)
      : error,
  );
}
export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    const id = z.uuid().safeParse(new URL(request.url).searchParams.get('submissionId'));
    if (!id.success) throw new ApiError('INVALID_INPUT', 400);
    return NextResponse.json(
      { ok: true, choices: await loadCorrectionChoices(user.id, id.data) },
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const parsed = choiceInput.safeParse(await readJson(request));
    if (!parsed.success) throw new ApiError('INVALID_INPUT', 400);
    const { submissionId, correctionIndex } = parsed.data;
    if ('reveal' in parsed.data) await revealCorrection(user.id, submissionId, correctionIndex);
    else await saveCorrectionChoice(user.id, submissionId, correctionIndex, parsed.data.status);
    return NextResponse.json({ ok: true }, { headers });
  } catch (error) {
    return failure(error);
  }
}
