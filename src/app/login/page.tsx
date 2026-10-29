import { redirect } from 'next/navigation';
import Login from '@/components/auth/Login';
import { authConfigured } from '@/lib/auth/config';
import { currentUser } from '@/lib/auth/server';
import { waitForLoadingPreview } from '@/lib/dev-loading';
import { pageMetadata } from '@/lib/i18n/metadata';
export function generateMetadata() {
  return pageMetadata('login');
}
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; delay?: string }>;
}) {
  await waitForLoadingPreview(searchParams);
  if (await currentUser()) redirect('/today');
  return (
    <Login
      configured={authConfigured()}
      googleEnabled={process.env.GOOGLE_AUTH_ENABLED === 'true'}
      callbackError={Boolean((await searchParams).error)}
    />
  );
}
