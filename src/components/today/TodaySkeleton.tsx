'use client';

import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import PageHeader from '@/components/shared/PageHeader';
import GoalSkeleton from '@/components/goal/GoalSkeleton';
import {
  ContentSkeleton,
  SkeletonButton,
  SkeletonLines,
  SkeletonPanel,
  SkeletonText,
} from '@/components/shared/ContentSkeleton';

export default function TodaySkeleton() {
  const t = useTranslations('today');
  const app = useTranslations('app');
  return (
    <Box data-ui="today-skeleton">
      <PageHeader
        title={t('title')}
        note={app('paperNotes.today')}
        subtitle={
          <Stack sx={{ gap: 0.75 }}>
            <SkeletonText variant="body2" width={220} />
            {t('tagline')}
          </Stack>
        }
      />
      <Stack sx={{ gap: { xs: 2, md: 2.5 } }}>
        <SkeletonPanel>
          <GoalSkeleton />
        </SkeletonPanel>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1.45fr) minmax(0, 1fr)' },
            gap: { xs: 2, md: 2.5 },
          }}
        >
          <SkeletonPanel sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) 168px' },
                gap: 2,
              }}
            >
              <Stack sx={{ gap: 1.5, minInlineSize: 0 }}>
                <SkeletonText variant="body2" width="75%" />
                <SkeletonText variant="h2" width="85%" />
                <SkeletonText variant="subtitle1" width="70%" />
                <SkeletonLines />
                <SkeletonButton />
              </Stack>
              <ContentSkeleton
                variant="rounded"
                width={168}
                height={150}
                sx={{ display: { xs: 'none', sm: 'block' } }}
              />
            </Box>
            <Box sx={{ borderBlockStart: 1, borderColor: 'divider', paddingBlockStart: 2.5 }}>
              <SkeletonText variant="body2" width="40%" />
              <Stack direction="row" sx={{ gap: 1, marginBlockStart: 1.25 }}>
                <ContentSkeleton variant="rounded" width={120} height={34} />
                <ContentSkeleton variant="rounded" width={100} height={34} />
              </Stack>
            </Box>
          </SkeletonPanel>
          <SkeletonPanel>
            <SkeletonText variant="h2" width="65%" />
            <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 0.5 }}>
              {Array.from({ length: 7 }, (_, day) => (
                <Stack key={day} sx={{ gap: 1, alignItems: 'center' }}>
                  <SkeletonText variant="caption" width={20} />
                  <ContentSkeleton variant="circular" width={34} height={34} />
                </Stack>
              ))}
            </Stack>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 3, marginBlockStart: 2 }}>
              <ContentSkeleton variant="circular" width={140} height={140} sx={{ flexShrink: 0 }} />
              <Box sx={{ flex: 1 }}>
                <SkeletonLines variant="body2" />
              </Box>
            </Stack>
            <SkeletonButton width="100%" />
          </SkeletonPanel>
        </Box>
        <SkeletonPanel sx={{ paddingBlock: 1.75 }}>
          <Stack direction="row" sx={{ gap: 2, alignItems: 'center' }}>
            <ContentSkeleton variant="circular" width={48} height={48} />
            <Box sx={{ flex: 1 }}>
              <SkeletonText variant="subtitle1" width="55%" />
              <SkeletonText variant="body2" width="40%" />
            </Box>
          </Stack>
        </SkeletonPanel>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1.18fr) minmax(0, 1fr)' },
            gap: { xs: 2, md: 2.5 },
            alignItems: 'start',
          }}
        >
          <SkeletonPanel>
            <SkeletonText variant="h2" width="55%" />
            <SkeletonText variant="caption" width="85%" />
            {[0, 1, 2].map((row) => (
              <Stack
                key={row}
                direction="row"
                sx={{ gap: 2, paddingBlock: 0.75, alignItems: 'center' }}
              >
                <ContentSkeleton
                  variant="rounded"
                  width={32}
                  height={32}
                  sx={{ display: { xs: 'none', sm: 'block' } }}
                />
                <Box sx={{ flex: 1 }}>
                  <SkeletonText width="85%" />
                </Box>
                <SkeletonButton width={90} />
              </Stack>
            ))}
          </SkeletonPanel>
          <Stack sx={{ gap: 2.5 }}>
            <SkeletonPanel>
              <SkeletonText variant="h3" width="65%" />
              <SkeletonText variant="subtitle1" width="75%" />
              <Box
                sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1 }}
              >
                {[0, 1, 2].map((step) => (
                  <Stack key={step} sx={{ alignItems: 'center', gap: 0.75 }}>
                    <ContentSkeleton variant="circular" width={32} height={32} />
                    <SkeletonText variant="caption" width="90%" />
                    <SkeletonText variant="caption" width="65%" />
                  </Stack>
                ))}
              </Box>
            </SkeletonPanel>
            <SkeletonPanel>
              <SkeletonText variant="h3" width="55%" />
              <SkeletonLines variant="body2" />
              <SkeletonButton />
            </SkeletonPanel>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
