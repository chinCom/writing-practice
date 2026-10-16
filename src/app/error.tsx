'use client';

import PageLoadError from '@/components/ui/PageLoadError';

export default function RouteError({ retry }: { error: Error; retry: () => void }) {
  return <PageLoadError retry={retry} />;
}
