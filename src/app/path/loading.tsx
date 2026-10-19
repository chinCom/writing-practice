import PageLoading from '@/components/shared/PageLoading';
import PathSkeleton from '@/components/curriculum/PathSkeleton';

export default function Loading() {
  return (
    <PageLoading>
      <PathSkeleton />
    </PageLoading>
  );
}
