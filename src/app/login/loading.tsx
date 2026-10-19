import PageLoading from '@/components/shared/PageLoading';
import LoginSkeleton from '@/components/auth/LoginSkeleton';
import { authConfigured } from '@/lib/auth/config';

export default function Loading() {
  return (
    <PageLoading>
      <LoginSkeleton
        configured={authConfigured()}
        googleEnabled={process.env.GOOGLE_AUTH_ENABLED === 'true'}
      />
    </PageLoading>
  );
}
