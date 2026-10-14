import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth/server';
import Portfolio from '@/components/portfolio/Portfolio';
export default async function Page() {
  if (!(await currentUser())) redirect('/login');
  return <Portfolio />;
}
