'use client';

import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LegalLinks from './LegalLinks';
import LiveDemo from './LiveDemo';

const steps = ['write', 'mark', 'revise'] as const;

function Steps() {
  const t = useTranslations('landing');
  return (
    <Box
      component="ol"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
        gap: 3,
        m: 0,
        p: 0,
        listStyle: 'none',
      }}
    >
      {steps.map((step) => (
        <Stack component="li" key={step} sx={{ gap: 0.5 }}>
          <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t('steps.' + step + '.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('steps.' + step + '.body')}
          </Typography>
        </Stack>
      ))}
    </Box>
  );
}

export default function Landing() {
  const t = useTranslations('landing');
  return (
    <Stack sx={{ gap: { xs: 4, md: 6 }, maxInlineSize: 960, marginInline: 'auto' }}>
      <Stack sx={{ gap: 2, maxInlineSize: '60ch' }}>
        <Typography variant="h1">{t('title')}</Typography>
        <Typography color="text.secondary">{t('body')}</Typography>
        <Stack direction="row" sx={{ gap: 1.5, flexWrap: 'wrap' }}>
          <Button component={NextLink} href="/login" variant="contained">
            {t('start')}
          </Button>
          <Button component={NextLink} href="/login" variant="outlined">
            {t('signIn')}
          </Button>
        </Stack>
      </Stack>
      <LiveDemo />
      <Steps />
      <LegalLinks />
    </Stack>
  );
}
