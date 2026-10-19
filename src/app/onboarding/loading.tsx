import PageLoading from '@/components/shared/PageLoading';
import OnboardingSkeleton from '@/components/onboarding/OnboardingSkeleton';

export default function Loading() {
  return (
    <PageLoading>
      <OnboardingSkeleton />
    </PageLoading>
  );
}
