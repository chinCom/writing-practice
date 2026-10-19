import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { currentUser } from '@/lib/auth/server';
import ProgressLayout, { ProgressLoadingPanels } from '@/components/progress/ProgressLayout';
import ProgressReport from '@/components/progress/ProgressReport';

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect('/login');
  return (
    <ProgressLayout>
      <Suspense fallback={<ProgressLoadingPanels />}>
        <ProgressReport userId={user.id} />
      </Suspense>
    </ProgressLayout>
  );
}
