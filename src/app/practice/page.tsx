import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth/server';
import Practice from '@/components/practice/Practice';
export default async function Page() {
  if (!(await currentUser())) redirect('/login');
  return <Practice />;
}
