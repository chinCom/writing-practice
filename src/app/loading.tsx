import PageLoading from '@/components/shared/PageLoading';
import LandingSkeleton from '@/components/landing/LandingSkeleton';

export default function Loading() {
  return (
    <PageLoading>
      <LandingSkeleton />
    </PageLoading>
  );
}
