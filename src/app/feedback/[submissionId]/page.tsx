import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { currentUser } from '@/lib/auth/server';
import { loadFeedbackReview } from '@/lib/db/queries';
import { avoidedTargets } from '@/lib/revision';
import { visibleFeedback } from '@/lib/targets';
import FeedbackView from '@/components/feedback/FeedbackView';

export default async function Page({ params }: { params: Promise<{ submissionId: string }> }) {
  const [user, { submissionId }] = await Promise.all([currentUser(), params]);
  if (!user) redirect('/login');
  if (!z.uuid().safeParse(submissionId).success) notFound();
  const { result, original, revisionSubmitted, choices } = await loadFeedbackReview(
    user.id,
    submissionId,
  );
  if (!result) notFound();
  const sameGrader =
    original?.model === result.feedback.model &&
    original?.promptVersion === result.feedback.promptVersion;
  const feedback = visibleFeedback(result.feedback.json);
  return (
    <FeedbackView
      submissionId={submissionId}
      taskId={result.submission.taskId}
      attempt={result.submission.attempt}
      text={result.submission.text}
      feedback={feedback}
      mock={result.feedback.model === 'mock'}
      hasPreviousVersion={Boolean(result.submission.parentSubmissionId)}
      hasSubmittedRevision={revisionSubmitted}
      avoided={
        sameGrader
          ? avoidedTargets(
              original && visibleFeedback(original.json).target_report,
              feedback.target_report,
            )
          : []
      }
      initialChoices={choices}
    />
  );
}
