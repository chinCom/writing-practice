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
import { DomainError } from '@/lib/domain-error';

/** Redirects for a missing, locked or warm-up-gated task before the page renders it. */
async function loadOwnedTask(userId: string, taskId: string) {
  try {
    return await loadTask(userId, taskId);
  } catch (error) {
    if (error instanceof DomainError && error.code === 'NOT_FOUND') notFound();
    if (
      error instanceof DomainError &&
      (error.code === 'LESSON_LOCKED' || error.code === 'WARMUPS_REQUIRED')
    )
      redirect('/path');
    throw error;
  }
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ revise?: string }>;
}) {
  // URL data and the session check do not depend on each other.
  const [{ taskId }, query, user] = await Promise.all([params, searchParams, currentUser()]);
  if (!/^[a-z0-9-]{1,80}$/.test(taskId)) notFound();
  if (!user) redirect('/login');
  const revision = query.revise;
  if (revision) {
    if (!z.uuid().safeParse(revision).success) notFound();
    // The task, saved feedback and saved choices are independent reads.
    const [task, result, choices] = await Promise.all([
      loadOwnedTask(user.id, taskId),
      loadFeedback(user.id, revision),
      loadCorrectionChoices(user.id, revision),
    ]);
    if (!result || result.submission.taskId !== taskId) notFound();
    if (result.submission.attempt >= maxRevisionAttempts) return <RevisionLimit taskId={taskId} />;
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
  const [task, initialText] = await Promise.all([
    loadOwnedTask(user.id, taskId),
    loadDraft(user.id, taskId),
  ]);
  return <LiveStudio key={task.id} task={task} initialText={initialText} />;
}
