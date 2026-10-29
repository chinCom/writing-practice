import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth/server';
import { loadGoalPath, loadPath } from '@/lib/db/curriculum';
import LearningPath from '@/components/curriculum/LearningPath';
import { pageMetadata } from '@/lib/i18n/metadata';
export function generateMetadata() {
  return pageMetadata('path');
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  const [{ track: requested }, user] = await Promise.all([searchParams, currentUser()]);
  if (!user) redirect('/login');
  // The track tabs link with an explicit track; a bare /path opens the learner's goal track.
  const { track, path } =
    requested === 'ielts' || requested === 'core'
      ? { track: requested, path: await loadPath(user.id, requested) }
      : await loadGoalPath(user.id);
  return <LearningPath path={path} track={track} />;
}
