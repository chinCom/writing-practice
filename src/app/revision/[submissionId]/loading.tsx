import PageLoading from '@/components/shared/PageLoading';
import RevisionSkeleton from '@/components/portfolio/RevisionSkeleton';

export default function Loading() {
  return (
    <PageLoading>
      <RevisionSkeleton />
    </PageLoading>
  );
}
