'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { beginLoadingNotice } from '@/lib/network-status';

export default function PageLoading() {
  const t = useTranslations('network');
  useEffect(beginLoadingNotice, []);
  return (
    <Stack role="status" aria-live="polite" sx={{ alignItems: 'center', gap: 2, py: 6 }}>
      <CircularProgress
        disableShrink
        aria-hidden
        sx={{ '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}
      />
      <Typography>{t('pageLoading')}</Typography>
    </Stack>
  );
}
