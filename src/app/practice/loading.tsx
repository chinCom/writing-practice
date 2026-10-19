import PageLoading from '@/components/shared/PageLoading';
import PracticeSkeleton from '@/components/practice/PracticeSkeleton';

export default function Loading() {
  return (
    <PageLoading>
      <PracticeSkeleton />
    </PageLoading>
  );
}
