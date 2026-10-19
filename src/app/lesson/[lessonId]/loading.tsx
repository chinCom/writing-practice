import PageLoading from '@/components/shared/PageLoading';
import LessonSkeleton from '@/components/curriculum/LessonSkeleton';

export default function Loading() {
  return (
    <PageLoading>
      <LessonSkeleton />
    </PageLoading>
  );
}
