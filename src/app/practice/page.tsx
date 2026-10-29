import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth/server';
import Practice from '@/components/practice/Practice';
import { pageMetadata } from '@/lib/i18n/metadata';
export function generateMetadata() {
  return pageMetadata('practice');
}
export default async function Page() {
  if (!(await currentUser())) redirect('/login');
  return <Practice />;
}
