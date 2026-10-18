'use client';

import PageLoadError from '@/components/shared/PageLoadError';

export default function RouteError({ retry }: { error: Error; retry: () => void }) {
  return <PageLoadError retry={retry} />;
}
