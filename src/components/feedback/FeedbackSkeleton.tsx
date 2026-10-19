'use client';

import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  ContentSkeleton,
  SkeletonButton,
  SkeletonLines,
  SkeletonPanel,
  SkeletonText,
} from '@/components/shared/ContentSkeleton';

export default function FeedbackSkeleton() {
  const t = useTranslations('feedback');
  return (
    <Stack data-ui="feedback-skeleton" sx={{ gap: 3 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) minmax(0, 0.6fr)' },
          gap: 2,
        }}
      >
        <Stack sx={{ gap: 1.5 }}>
          <Typography component="h1" variant="h1">
            {t('title')}
          </Typography>
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
            {[110, 160, 140].map((width) => (
              <ContentSkeleton key={width} variant="rounded" width={width} height={28} />
            ))}
          </Stack>
        </Stack>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 1.5,
            paddingBlockStart: { lg: 1 },
          }}
        >
          {[0, 1, 2, 3].map((score) => (
            <Stack key={score} direction="row" sx={{ gap: 2, alignItems: 'center' }}>
              <SkeletonText variant="caption" width={100} />
              <ContentSkeleton variant="rounded" height={8} sx={{ flex: 1 }} />
            </Stack>
          ))}
        </Box>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) minmax(0, 0.53fr)' },
          gap: { xs: 2, md: 3 },
          alignItems: 'start',
        }}
      >
        <SkeletonPanel
          data-ui="feedback-canvas-skeleton"
          sx={(theme) => ({
            p: { xs: 2, md: 4 },
            minBlockSize: { md: theme.layout.feedbackCanvasMinHeight },
          })}
        >
          <SkeletonText variant="caption" width="40%" />
          <SkeletonLines variant="canvas" widths={['95%', '100%', '90%', '98%', '60%']} />
          <SkeletonLines variant="canvas" widths={['100%', '94%', '75%']} />
          <SkeletonButton width={180} />
        </SkeletonPanel>
        <Stack
          data-ui="correction-cards-skeleton"
          sx={{ gap: 1.5, display: { xs: 'none', md: 'flex' } }}
        >
          {[0, 1, 2].map((card) => (
            <SkeletonPanel key={card}>
              <SkeletonText variant="subtitle2" width="65%" />
              <SkeletonLines variant="body2" />
              <SkeletonButton width={130} />
            </SkeletonPanel>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}
