'use client';
import { useId } from 'react';
import { useTranslations } from 'next-intl';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import type { AdvisoryTarget } from '@/lib/mastery';

export default function TargetRecommendations({ targets }: { targets: AdvisoryTarget[] }) {
  const id = useId();
  const t = useTranslations('feedback');
  if (!targets.length) return null;
  return (
    <Stack
      component="section"
      aria-labelledby={id}
      sx={{
        gap: 1,
        p: 1.5,
        bgcolor: 'tonal.primary',
        borderRadius: 2,
      }}
    >
      <Typography id={id} component="h2" variant="subtitle2" color="secondary.main">
        {t('recommendationsTitle')}
      </Typography>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
        {targets.map((target) => (
          <Chip
            key={target.tag}
            size="small"
            variant="outlined"
            label={
              t('tags.' + target.tag) +
              ' — ' +
              t(target.source === 'unit' ? 'unitTarget' : 'carriedTarget')
            }
            sx={{ bgcolor: 'background.paper', borderColor: 'divider' }}
          />
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {t('advisoryOnly')}
      </Typography>
    </Stack>
  );
}
