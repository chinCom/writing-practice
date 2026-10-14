import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { currentUser } from '@/lib/auth/server';
import { loadDraft, loadFeedback } from '@/lib/db/queries';
import { loadCorrectionChoices } from '@/lib/db/corrections';
import { revisionText } from '@/lib/revision';
import LiveStudio from '@/components/studio/LiveStudio';
import { loadTask } from '@/lib/db/curriculum';
import { maxRevisionAttempts } from '@/lib/limits';
import RevisionLimit from '@/components/studio/RevisionLimit';
import { ApiError } from '@/lib/api';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ revise?: string }>;
}) {
  const { taskId } = await params;
  if (!/^[a-z0-9-]{1,80}$/.test(taskId)) notFound();
  const user = await currentUser();
  if (!user) redirect('/login');
  let task;
  try {
    task = await loadTask(user.id, taskId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    if (error instanceof ApiError && error.status === 403) redirect('/path');
    throw error;
  }
  const revision = (await searchParams).revise;
  if (revision) {
    if (!z.uuid().safeParse(revision).success) notFound();
    const result = await loadFeedback(user.id, revision);
    if (!result || result.submission.taskId !== taskId) notFound();
    if (result.submission.attempt >= maxRevisionAttempts) return <RevisionLimit taskId={taskId} />;
    const choices = await loadCorrectionChoices(user.id, revision);
    const applied = new Set(
      choices
        .filter((choice) => choice.status === 'applied')
        .map((choice) => choice.correctionIndex),
    );
    return (
      <LiveStudio
        key={revision}
        task={task}
        initialText={revisionText(
          result.submission.text,
          result.feedback.json.corrections,
          applied,
        )}
        parentSubmissionId={revision}
        attempt={result.submission.attempt + 1}
      />
    );
  }
  return <LiveStudio key={task.id} task={task} initialText={await loadDraft(user.id, task.id)} />;
}
