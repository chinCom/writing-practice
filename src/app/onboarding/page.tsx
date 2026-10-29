import { redirect } from 'next/navigation';
import Onboarding from '@/components/onboarding/Onboarding';
import { currentUser } from '@/lib/auth/server';
import { loadProfile } from '@/lib/db/profile';
import { pageMetadata } from '@/lib/i18n/metadata';
export function generateMetadata() {
  return pageMetadata('onboarding');
}
// The earliest target date a learner can pick, read once per request on the server.
function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}
export default async function Page() {
  const user = await currentUser();
  if (!user) redirect('/login');
  const profile = await loadProfile(user.id);
  return <Onboarding initialProfile={profile} today={todayUtc()} />;
}
