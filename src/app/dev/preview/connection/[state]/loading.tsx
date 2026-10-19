import PageLoading from '@/components/shared/PageLoading';
import ConnectionSkeleton from '@/components/layout/ConnectionSkeleton';

export default function Loading() {
  return (
    <PageLoading>
      <ConnectionSkeleton />
    </PageLoading>
  );
}
