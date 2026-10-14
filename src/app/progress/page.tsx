import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth/server';
import Progress from '@/components/progress/Progress';
export default async function Page() {
  if (!(await currentUser())) redirect('/login');
  return <Progress />;
}
