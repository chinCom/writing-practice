'use client';

import { useTranslations } from 'next-intl';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import NavigationButton from '@/components/shared/NavigationButton';

export default function ConnectionPreview() {
  const t = useTranslations('network');
  return (
    <Stack sx={{ gap: 2, alignItems: 'flex-start' }}>
      <Typography variant="h1">{t('previewReady')}</Typography>
      <NavigationButton href="/dev/preview/connection/slow" prefetch={false}>
        {t('previewSlow')}
      </NavigationButton>
      <NavigationButton href="/dev/preview/connection/error" prefetch={false}>
        {t('previewError')}
      </NavigationButton>
    </Stack>
  );
}
