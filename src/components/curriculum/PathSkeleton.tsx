'use client';

import { useTranslations } from 'next-intl';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import PageHeader from '@/components/shared/PageHeader';
import {
  ContentSkeleton,
  SkeletonLines,
  SkeletonPanel,
  SkeletonText,
} from '@/components/shared/ContentSkeleton';

export default function PathSkeleton() {
  const t = useTranslations('curriculum');
  const app = useTranslations('app');
  return (
    <Container data-ui="path-skeleton" maxWidth="lg" disableGutters>
      <Stack sx={{ gap: { xs: 2.5, md: 3 } }}>
        <PageHeader
          title={t('pathTitle')}
          subtitle={t('pathIntro')}
          note={app('paperNotes.path')}
        />
        <ContentSkeleton variant="rounded" width={310} height={48} sx={{ maxInlineSize: '100%' }} />
        <ContentSkeleton variant="rounded" height={52} />
        <ContentSkeleton variant="rounded" width={160} height={32} />
        {[0, 1].map((unit) => (
          <SkeletonPanel key={unit} sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center' }}>
              <ContentSkeleton variant="rounded" width={48} height={32} />
              <Box sx={{ flex: 1 }}>
                <SkeletonText variant="h2" width="65%" />
              </Box>
            </Stack>
            <SkeletonLines widths={['85%']} />
            <Stack direction="row" sx={{ gap: 1 }}>
              <ContentSkeleton variant="rounded" width={100} height={24} />
              <ContentSkeleton variant="rounded" width={120} height={24} />
            </Stack>
            <SkeletonText variant="caption" width={170} />
            <ContentSkeleton variant="rounded" height={6} />
            <Stack data-ui="path-lessons-skeleton" sx={{ gap: 3, paddingBlock: 1 }}>
              {[0, 1, 2].map((lesson) => (
                <Stack key={lesson} direction="row" sx={{ gap: 2, alignItems: 'center' }}>
                  <ContentSkeleton
                    variant="circular"
                    width={44}
                    height={44}
                    sx={{ flexShrink: 0 }}
                  />
                  <Box sx={{ flex: 1, minInlineSize: 0 }}>
                    <SkeletonText variant="subtitle1" width="65%" />
                    <SkeletonText variant="caption" width="85%" />
                  </Box>
                </Stack>
              ))}
            </Stack>
          </SkeletonPanel>
        ))}
      </Stack>
    </Container>
  );
}
