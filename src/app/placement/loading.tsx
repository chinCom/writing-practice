import PageLoading from '@/components/shared/PageLoading';
import PlacementSkeleton from '@/components/curriculum/PlacementSkeleton';

export default function Loading() {
  return (
    <PageLoading>
      <PlacementSkeleton />
    </PageLoading>
  );
}
