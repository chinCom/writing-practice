'use client';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { CurriculumTask } from '@/lib/curriculum';

export default function ReadingPassage({ reading }: { reading: CurriculumTask['reading'] }) {
  const t = useTranslations('curriculum');
  if (!reading) return null;
  return (
    <Box
      component="section"
      aria-label={t('readingTitle')}
      sx={{ my: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}
    >
      <Stack sx={{ gap: 1 }}>
        <Typography component="h2" variant="h3">
          {t('readingTitle')}
        </Typography>
        <Typography component="h3" variant="subtitle1">
          {reading.title}
        </Typography>
        <Typography dir="ltr" sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
          {reading.text}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t(reading.mode === 'summary' ? 'readingSummary' : 'readingContinuation')}
        </Typography>
      </Stack>
    </Box>
  );
}
