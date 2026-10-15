'use client';

import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';

export default function LegalLinks() {
  const t = useTranslations('legal');
  return (
    <Stack
      component="nav"
      aria-label={t('nav')}
      direction="row"
      sx={{ gap: 3, flexWrap: 'wrap', typography: 'body2' }}
    >
      <Link component={NextLink} href="/privacy" sx={{ py: 1.25 }}>
        {t('privacy.title')}
      </Link>
      <Link component={NextLink} href="/terms" sx={{ py: 1.25 }}>
        {t('terms.title')}
      </Link>
    </Stack>
  );
}
