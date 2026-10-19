import PageLoading from '@/components/shared/PageLoading';
import TodaySkeleton from '@/components/today/TodaySkeleton';

export default function Loading() {
  return (
    <PageLoading>
      <TodaySkeleton />
    </PageLoading>
  );
}
