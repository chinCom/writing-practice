'use client';

import { useEffect, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import Stack from '@mui/material/Stack';
import PageHeader from '@/components/shared/PageHeader';
import { LoadingContent } from '@/components/shared/ContentSkeleton';
import { ProgressPanelsSkeleton } from './ProgressSkeleton';
import { beginLoadingNotice } from '@/lib/network-status';

export function ProgressLoadingPanels() {
  const t = useTranslations('progress');
  useEffect(beginLoadingNotice, []);
  return (
    <LoadingContent label={t('loading')}>
      <ProgressPanelsSkeleton />
    </LoadingContent>
  );
}

export default function ProgressLayout({ children }: { children: ReactNode }) {
  const t = useTranslations('progress');
  const app = useTranslations('app');
  return (
    <Stack sx={{ gap: { xs: 2.5, md: 3 } }}>
      <PageHeader title={t('title')} subtitle={t('subtitle')} note={app('paperNotes.progress')} />
      {children}
    </Stack>
  );
}
