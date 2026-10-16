'use client';

import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export default function ConnectionPreview() {
  const t = useTranslations('network');
  return (
    <Stack sx={{ gap: 2, alignItems: 'flex-start' }}>
      <Typography variant="h1">{t('previewReady')}</Typography>
      <Button component={NextLink} href="/dev/preview/connection/slow" prefetch={false}>
        {t('previewSlow')}
      </Button>
      <Button component={NextLink} href="/dev/preview/connection/error" prefetch={false}>
        {t('previewError')}
      </Button>
    </Stack>
  );
}
