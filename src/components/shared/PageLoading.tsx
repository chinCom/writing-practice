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
    <Stack
      role="status"
      aria-live="polite"
      sx={(theme) => ({
        alignItems: 'center',
        justifyContent: 'center',
        // Fill the viewport space left by AppShell's responsive padding.
        minHeight: {
          xs: `calc(100dvh - ${theme.layout.topBarHeight}px - ${theme.layout.bottomNavHeight}px - ${theme.spacing(7)})`,
          md: `calc(100dvh - ${theme.spacing(12.5)})`,
        },
        gap: 2,
        py: 6,
      })}
    >
      <CircularProgress
        disableShrink
        aria-hidden
        sx={{ '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}
      />
      <Typography>{t('pageLoading')}</Typography>
    </Stack>
  );
}
