'use client';

import { useState, useSyncExternalStore, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import ActionButton from './ActionButton';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  getNetworkStatus,
  getServerNetworkStatus,
  subscribeNetworkStatus,
} from '@/lib/network-status';

export default function PageLoadError({ retry }: { retry: () => void }) {
  const t = useTranslations('network');
  const [open, setOpen] = useState(true);
  const [pending, startTransition] = useTransition();
  const { online } = useSyncExternalStore(
    subscribeNetworkStatus,
    getNetworkStatus,
    getServerNetworkStatus,
  );

  function tryAgain() {
    setOpen(true);
    startTransition(retry);
  }

  function close() {
    setOpen(false);
  }

  const retryLabel = pending ? t('retrying') : t('retry');
  const retryDisabled = pending || !online;
  return (
    <Container maxWidth="sm">
      <Stack sx={{ gap: 2, py: 4, alignItems: 'flex-start' }}>
        <Typography component="h1" variant="h2">
          {t('pageErrorTitle')}
        </Typography>
        <Typography color="text.secondary">{t('pageErrorBody')}</Typography>
        <ActionButton tone="primary" onClick={tryAgain} disabled={retryDisabled}>
          {retryLabel}
        </ActionButton>
      </Stack>
      <Dialog
        open={open}
        onClose={close}
        role="alertdialog"
        aria-labelledby="page-load-error-title"
        aria-describedby="page-load-error-description"
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle id="page-load-error-title">{t('pageErrorTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText id="page-load-error-description">
            {t('pageErrorBody')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <ActionButton tone="quiet" onClick={close}>
            {t('close')}
          </ActionButton>
          <ActionButton tone="primary" onClick={tryAgain} disabled={retryDisabled}>
            {retryLabel}
          </ActionButton>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
