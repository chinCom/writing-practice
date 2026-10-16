import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { currentUser } from '@/lib/auth/server';
import { loadFeedback, loadOriginalFeedback } from '@/lib/db/queries';
import { avoidedTargets } from '@/lib/revision';
import { loadCorrectionChoices, hasSubmittedRevision } from '@/lib/db/corrections';
import FeedbackView from '@/components/feedback/FeedbackView';
export default async function Page({ params }: { params: Promise<{ submissionId: string }> }) {
  const user = await currentUser();
  if (!user) redirect('/login');
  const { submissionId } = await params;
  if (!z.uuid().safeParse(submissionId).success) notFound();
  const result = await loadFeedback(user.id, submissionId);
  if (!result) notFound();
  const original = await loadOriginalFeedback(user.id, submissionId);
  const sameGrader =
    original?.model === result.feedback.model &&
    original?.promptVersion === result.feedback.promptVersion;
  return (
    <FeedbackView
      submissionId={submissionId}
      taskId={result.submission.taskId}
      attempt={result.submission.attempt}
      text={result.submission.text}
      feedback={result.feedback.json}
      mock={result.feedback.model === 'mock'}
      hasPreviousVersion={Boolean(result.submission.parentSubmissionId)}
      hasSubmittedRevision={await hasSubmittedRevision(user.id, submissionId)}
      avoided={
        sameGrader
          ? avoidedTargets(original?.json.target_report, result.feedback.json.target_report)
          : []
      }
      initialChoices={
        result.feedback.json.safety_flag ? [] : await loadCorrectionChoices(user.id, submissionId)
      }
    />
  );
}
