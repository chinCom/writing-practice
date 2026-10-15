import { redirect } from 'next/navigation';
import Landing from '@/components/landing/Landing';
import { currentUser } from '@/lib/auth/server';
export default async function Page() {
  if (await currentUser()) redirect('/today');
  return <Landing />;
}
