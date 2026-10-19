import PageLoading from '@/components/shared/PageLoading';
import FeedbackSkeleton from '@/components/feedback/FeedbackSkeleton';

export default function Loading() {
  return (
    <PageLoading>
      <FeedbackSkeleton />
    </PageLoading>
  );
}
