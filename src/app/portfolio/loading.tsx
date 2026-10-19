import PageLoading from '@/components/shared/PageLoading';
import PortfolioSkeleton from '@/components/portfolio/PortfolioSkeleton';

export default function Loading() {
  return (
    <PageLoading>
      <PortfolioSkeleton />
    </PageLoading>
  );
}
