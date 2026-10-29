import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth/server';
import Portfolio from '@/components/portfolio/Portfolio';
import { pageMetadata } from '@/lib/i18n/metadata';
export function generateMetadata() {
  return pageMetadata('portfolio');
}
export default async function Page() {
  if (!(await currentUser())) redirect('/login');
  return <Portfolio />;
}
