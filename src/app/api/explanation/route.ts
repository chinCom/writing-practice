import { z } from 'zod';
import { NextResponse } from 'next/server';
import { apiFailure, ApiError, readJson, requireApiUser } from '@/lib/api';
import { loadFeedback } from '@/lib/db/queries';
import { requireCorrectionAnswer } from '@/lib/db/corrections';
import { failExplanation, finishExplanation, reserveExplanation } from '@/lib/db/explanations';
import { explainCorrection } from '@/lib/llm/explain';
import { LlmError } from '@/lib/llm/grade';

export const maxDuration = 30;
const InputSchema = z.strictObject({
  submissionId: z.uuid(),
  correctionIndex: z.number().int().min(0).max(11),
});
const headers = { 'Cache-Control': 'private, no-store' };
export async function POST(request: Request) {
  let claim: { userId: string; requestKey: string } | undefined;
  try {
    const user = await requireApiUser(request);
    const parsed = InputSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new ApiError('INVALID_INPUT', 400);
    const { submissionId, correctionIndex } = parsed.data;
    const saved = await loadFeedback(user.id, submissionId);
    const correction = saved?.feedback.json.corrections[correctionIndex];
    if (!saved || !correction || saved.feedback.json.safety_flag)
      throw new ApiError('NOT_FOUND', 404);
    await requireCorrectionAnswer(user.id, submissionId, correctionIndex);
    const reserved = await reserveExplanation(user.id, submissionId, correctionIndex);
    if (reserved.kind === 'completed')
      return NextResponse.json(
        { ok: true, data: reserved.row.json, mock: reserved.row.mock },
        { headers },
      );
    if (reserved.kind === 'pending')
      return NextResponse.json(
        { ok: true, pending: true },
        { status: 202, headers: { ...headers, 'Retry-After': '2' } },
      );
    claim = { userId: user.id, requestKey: reserved.requestKey };
    const result = await explainCorrection(
      {
        text: saved.submission.text,
        original: correction.original,
        suggestion: correction.suggestion,
        tag: correction.tag,
        explanation: correction.explanation,
      },
      {
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
        model: process.env.DEEPSEEK_MODEL ?? 'deepseek-flash',
        mock: saved.feedback.model === 'mock',
      },
    );
    await finishExplanation(user.id, reserved.requestKey, result);
    return NextResponse.json({ ok: true, data: result.data, mock: result.mock }, { headers });
  } catch (error) {
    if (claim) await failExplanation(claim.userId, claim.requestKey).catch(() => undefined);
    if (error instanceof LlmError)
      return apiFailure(
        new ApiError(
          error.message === 'LLM_TIMEOUT' ? 'EXPLANATION_TIMEOUT' : 'EXPLANATION_UNAVAILABLE',
          502,
        ),
      );
    if (error instanceof Error && error.message === 'EXPLANATION_LIMIT')
      return apiFailure(new ApiError('EXPLANATION_LIMIT', 429));
    return apiFailure(error);
  }
}
