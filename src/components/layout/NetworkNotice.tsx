'use client';

import { useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Snackbar from '@mui/material/Snackbar';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  getNetworkStatus,
  getServerNetworkStatus,
  subscribeNetworkStatus,
} from '@/lib/network-status';

export default function NetworkNotice() {
  const t = useTranslations('network');
  const status = useSyncExternalStore(
    subscribeNetworkStatus,
    getNetworkStatus,
    getServerNetworkStatus,
  );
  const [dismissed, setDismissed] = useState<string | null>(null);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const offline = !status.online;
  const active = offline || status.slowRequests > 0;
  if (!active) return null;
  const noticeId = offline ? 'offline-' + status.offlineEpisode : 'slow-' + status.slowEpisode;
  const title = offline ? t('offlineTitle') : t('slowTitle');
  const message = offline ? t('offlineBody') : t('slowBody');

  function dismiss() {
    setDismissed(noticeId);
  }

  return (
    <Snackbar
      open={active && dismissed !== noticeId}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transitionDuration={reducedMotion ? 0 : undefined}
      onClose={(_, reason) => {
        if (reason !== 'clickaway') dismiss();
      }}
      sx={(theme) => ({
        bottom: {
          xs: 'calc(' + theme.layout.bottomNavHeight + 'px + ' + theme.spacing(2) + ')',
          md: theme.spacing(3),
        },
      })}
    >
      <Alert
        role="status"
        aria-live="polite"
        severity={offline ? 'warning' : 'info'}
        closeText={t('dismiss')}
        onClose={dismiss}
        sx={{ maxWidth: 'sm', boxShadow: 3 }}
      >
        <AlertTitle>{title}</AlertTitle>
        {message}
      </Alert>
    </Snackbar>
  );
}
