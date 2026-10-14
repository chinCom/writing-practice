import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth/server';
import { loadPath } from '@/lib/db/curriculum';
import LearningPath from '@/components/curriculum/LearningPath';
export default async function Page() {
  const user = await currentUser();
  if (!user) redirect('/login');
  return <LearningPath path={await loadPath(user.id)} />;
}
