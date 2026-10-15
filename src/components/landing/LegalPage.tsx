'use client';

import { useTranslations } from 'next-intl';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LegalLinks from './LegalLinks';

type LegalSection = { title: string; body: string[] };

function Section({ section }: { section: LegalSection }) {
  return (
    <Stack component="section" sx={{ gap: 1 }}>
      <Typography component="h2" variant="h3">
        {section.title}
      </Typography>
      {section.body.map((paragraph) => (
        <Typography key={paragraph}>{paragraph}</Typography>
      ))}
    </Stack>
  );
}

export default function LegalPage({ document }: { document: 'privacy' | 'terms' }) {
  const t = useTranslations('legal');
  const sections = t.raw(document + '.sections') as LegalSection[];
  return (
    <Stack component="article" sx={{ gap: 3, maxInlineSize: '70ch', marginInline: 'auto' }}>
      <Typography variant="h1">{t(document + '.title')}</Typography>
      <Alert severity="warning" role="note">
        {t('draft')}
      </Alert>
      <Typography color="text.secondary">{t('effective')}</Typography>
      {sections.map((section) => (
        <Section key={section.title} section={section} />
      ))}
      <LegalLinks />
    </Stack>
  );
}
