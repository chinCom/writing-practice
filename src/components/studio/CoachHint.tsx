'use client';

import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function CoachHint() {
  const t = useTranslations('studio');
  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h3" sx={{ mb: 2.5 }}>
        {t('coach')}
      </Typography>
      <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
        {t('question')}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t('hint')}
      </Typography>
    </Box>
  );
}
