'use client';
import { useId } from 'react';
import { useTranslations } from 'next-intl';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { AdvisoryTarget } from '@/lib/mastery';

export default function TargetRecommendations({ targets }: { targets: AdvisoryTarget[] }) {
  const id = useId();
  const t = useTranslations('feedback');
  if (!targets.length) return null;
  return (
    <Stack component="section" aria-labelledby={id} sx={{ gap: 1 }}>
      <Typography id={id} component="h2" variant="subtitle1">
        {t('recommendationsTitle')}
      </Typography>
      {targets.map((target) => (
        <Typography key={target.tag} variant="body2">
          {t('tags.' + target.tag)} — {t(target.source === 'unit' ? 'unitTarget' : 'carriedTarget')}
        </Typography>
      ))}
      <Typography variant="body2" color="text.secondary">
        {t('advisoryOnly')}
      </Typography>
    </Stack>
  );
}
