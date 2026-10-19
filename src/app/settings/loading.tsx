import PageLoading from '@/components/shared/PageLoading';
import SettingsSkeleton from '@/components/layout/SettingsSkeleton';

export default function Loading() {
  return (
    <PageLoading>
      <SettingsSkeleton />
    </PageLoading>
  );
}
