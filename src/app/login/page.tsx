import { redirect } from 'next/navigation';
import Login from '@/components/auth/Login';
import { authConfigured } from '@/lib/auth/config';
import { currentUser } from '@/lib/auth/server';
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await currentUser()) redirect('/today');
  return (
    <Login
      configured={authConfigured()}
      googleEnabled={process.env.GOOGLE_AUTH_ENABLED === 'true'}
      callbackError={Boolean((await searchParams).error)}
    />
  );
}
