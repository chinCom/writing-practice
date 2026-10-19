'use client';

import { useTranslations } from 'next-intl';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import PlacementSampleField from './PlacementSampleField';
import { placementQuestions } from '@/lib/curriculum';
import { SkeletonButton, SkeletonMask, SkeletonPanel } from '@/components/shared/ContentSkeleton';

export default function PlacementSkeleton() {
  const t = useTranslations('curriculum');
  return (
    <Container data-ui="placement-skeleton" maxWidth="md" sx={{ paddingBlock: 4 }}>
      <Stack sx={{ gap: 3 }}>
        <Typography component="h1" variant="h1">
          {t('placementTitle')}
        </Typography>
        <Typography>{t('placementIntro')}</Typography>
        <Alert severity="info">{t('placementLimitNotice')}</Alert>
        <SkeletonPanel padding={3}>
          <Stack sx={{ gap: 3 }}>
            {['aboutYou', 'recentDay'].map((field, index) => (
              <SkeletonMask key={field} loading variant="rounded">
                <PlacementSampleField
                  label={t(field)}
                  helperText={t(index === 0 ? 'aboutPrompt' : 'dayPrompt')}
                  disabled
                  value=""
                />
              </SkeletonMask>
            ))}
            {placementQuestions.map((question) => (
              <SkeletonMask key={question.prompt} loading variant="rounded">
                <TextField
                  select
                  fullWidth
                  label={question.prompt}
                  value=""
                  disabled
                  slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
                >
                  <Box component="option" value="">
                    {t('choose')}
                  </Box>
                </TextField>
              </SkeletonMask>
            ))}
            <SkeletonButton width="100%" />
          </Stack>
        </SkeletonPanel>
      </Stack>
    </Container>
  );
}
