'use client';

import { useEffect, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { LoadingContent } from './ContentSkeleton';
import { beginLoadingNotice } from '@/lib/network-status';

export default function PageLoading({ children }: { children: ReactNode }) {
  const t = useTranslations('network');
  useEffect(beginLoadingNotice, []);
  return <LoadingContent label={t('pageLoading')}>{children}</LoadingContent>;
}
