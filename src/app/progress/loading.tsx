import PageLoading from '@/components/shared/PageLoading';
import ProgressSkeleton from '@/components/progress/ProgressSkeleton';

export default function Loading() {
  return (
    <PageLoading>
      <ProgressSkeleton />
    </PageLoading>
  );
}
