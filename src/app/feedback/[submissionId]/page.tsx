import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { currentUser } from '@/lib/auth/server';
import { loadFeedback } from '@/lib/db/queries';
import FeedbackView from '@/components/feedback/FeedbackView';
export default async function Page({ params }: { params: Promise<{ submissionId: string }> }) {
  const user = await currentUser();
  if (!user) redirect('/login');
  const { submissionId } = await params;
  if (!z.uuid().safeParse(submissionId).success) notFound();
  const result = await loadFeedback(user.id, submissionId);
  if (!result) notFound();
  return (
    <FeedbackView
      submissionId={submissionId}
      text={result.submission.text}
      feedback={result.feedback.json}
      mock={result.feedback.model === 'mock'}
    />
  );
}
