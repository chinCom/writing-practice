import 'server-only';
import type { z } from 'zod';
import type { CurriculumTask } from '@/lib/curriculum';
import {
  claimSubmission,
  completeSubmission,
  failSubmission,
  loadCheck,
  loadFeedback,
  reserveSubmission,
} from '@/lib/db/queries';
import { gradeWriting } from '@/lib/llm/grade';
import { locateFeedback, validateTargetReport, visibleFeedback } from '@/lib/targets';
import type { FeedbackInput } from './input';
import type { ErrorTag, LocatedFeedback } from './schema';

const reservationErrorCodes = [
  'DAILY_LIMIT',
  'INVALID_PARENT',
  'CHECK_CONFLICT',
  'CHECK_IN_PROGRESS',
] as const;

type SubmissionCheckErrorCode =
  (typeof reservationErrorCodes)[number] | 'COACH_NOT_CONFIGURED' | 'COACH_FAILED' | 'SERVER_ERROR';

export class SubmissionCheckError extends Error {
  constructor(public code: SubmissionCheckErrorCode) {
    super(code);
  }
}

type SubmissionContext = {
  task: CurriculumTask;
  targets: z.infer<typeof ErrorTag>[];
};

type SubmissionCheckResult =
  | { submissionId: string; status: 'pending' }
  | { submissionId: string; status: 'completed'; feedback: LocatedFeedback; mock?: boolean };

// The caller supplies the verified owner and validated input for an accessible task.
export async function checkSubmission(
  userId: string,
  input: FeedbackInput,
  requestKey: string,
  { task, targets }: SubmissionContext,
): Promise<SubmissionCheckResult> {
  let submissionId: string | undefined;
  let claimed = false;
  try {
    if (!process.env.DEEPSEEK_API_KEY && process.env.USE_MOCK_LLM !== 'true')
      throw new SubmissionCheckError('COACH_NOT_CONFIGURED');
    try {
      submissionId = await reserveSubmission(userId, input, requestKey);
    } catch (error) {
      if (error instanceof Error) {
        const code = reservationErrorCodes.find((code) => code === error.message);
        if (code) throw new SubmissionCheckError(code);
      }
      throw error;
    }
    const previous = await loadCheck(userId, requestKey);
    if (previous?.status === 'completed') {
      const saved = await loadFeedback(userId, submissionId);
      if (!saved) throw new SubmissionCheckError('SERVER_ERROR');
      return {
        submissionId,
        feedback: visibleFeedback(saved.feedback.json),
        status: 'completed',
      };
    }
    if (previous?.status === 'failed') throw new SubmissionCheckError('COACH_FAILED');
    claimed = await claimSubmission(userId, submissionId);
    if (!claimed) return { submissionId, status: 'pending' };

    // Keep provider work outside the short, owner-isolated database transactions.
    const result = await gradeWriting(input.text, {
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
      model: process.env.DEEPSEEK_MODEL ?? 'deepseek-flash',
      mock: process.env.USE_MOCK_LLM === 'true',
      task,
      targets,
    });
    const feedback = validateTargetReport(
      locateFeedback(input.text, validateTargetReport(result.data, targets)),
      targets,
    );
    await completeSubmission(userId, submissionId, feedback, result);
    return { submissionId, feedback, mock: result.mock, status: 'completed' };
  } catch (error) {
    if (claimed && submissionId) await failSubmission(userId, submissionId).catch(() => undefined);
    throw error;
  }
}
