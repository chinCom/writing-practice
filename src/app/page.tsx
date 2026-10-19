import { redirect } from 'next/navigation';
import Landing from '@/components/landing/Landing';
import { currentUser } from '@/lib/auth/server';
import { waitForLoadingPreview } from '@/lib/dev-loading';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ delay?: string }>;
}) {
  await waitForLoadingPreview(searchParams);
  if (await currentUser()) redirect('/today');
  return <Landing />;
}
