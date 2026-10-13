import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { currentUser } from '@/lib/auth/server';
import { loadDraft, loadFeedback } from '@/lib/db/queries';
import LiveStudio from '@/components/studio/LiveStudio';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ revise?: string }>;
}) {
  if ((await params).taskId !== 'weekend') notFound();
  const user = await currentUser();
  if (!user) redirect('/login');
  const revision = (await searchParams).revise;
  if (revision) {
    if (!z.uuid().safeParse(revision).success) notFound();
    const result = await loadFeedback(user.id, revision);
    if (!result) notFound();
    return (
      <LiveStudio
        initialText={result.submission.text}
        parentSubmissionId={revision}
        attempt={result.submission.attempt + 1}
      />
    );
  }
  return <LiveStudio initialText={await loadDraft(user.id)} />;
}
