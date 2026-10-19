import PageLoading from '@/components/shared/PageLoading';
import StudioSkeleton from '@/components/studio/StudioSkeleton';

export default function Loading() {
  return (
    <PageLoading>
      <StudioSkeleton />
    </PageLoading>
  );
}
