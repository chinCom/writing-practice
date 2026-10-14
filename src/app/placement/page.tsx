import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth/server';
import { loadPath } from '@/lib/db/curriculum';
import Placement from '@/components/curriculum/Placement';
export default async function Page() {
  const user = await currentUser();
  if (!user) redirect('/login');
  const path = await loadPath(user.id);
  return <Placement initialResult={path.placement} />;
}
