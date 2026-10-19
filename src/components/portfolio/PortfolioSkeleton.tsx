'use client';

import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import PageHeader from '@/components/shared/PageHeader';
import StatTilesSkeleton from '@/components/shared/StatTilesSkeleton';
import {
  ContentSkeleton,
  SkeletonButton,
  SkeletonLines,
  SkeletonPanel,
  SkeletonText,
} from '@/components/shared/ContentSkeleton';

function EntryBodySkeleton({ featured }: { featured: boolean }) {
  return (
    <Stack sx={{ gap: 1.25, minInlineSize: 0 }}>
      <Stack direction="row" sx={{ gap: 1 }}>
        <ContentSkeleton variant="rounded" width={85} height={24} />
        <ContentSkeleton variant="rounded" width={100} height={24} />
      </Stack>
      {featured ? <SkeletonText variant="caption" width="48%" /> : null}
      <SkeletonText variant={featured ? 'h2' : 'h3'} width="60%" />
      {featured ? <SkeletonText variant="caption" width="65%" /> : null}
      <SkeletonLines widths={featured ? ['100%', '95%', '100%', '70%'] : ['98%', '80%']} />
    </Stack>
  );
}

function EntryActionsSkeleton() {
  return (
    <Stack sx={{ gap: 1 }}>
      <SkeletonText variant="caption" width="65%" />
      <SkeletonText variant="subtitle1" width="45%" />
      <SkeletonText variant="caption" width="85%" />
      <SkeletonButton width="100%" />
    </Stack>
  );
}

export function PortfolioEntriesSkeleton({ featured = true }: { featured?: boolean }) {
  return (
    <Stack data-ui="portfolio-entries-skeleton" sx={{ gap: 3 }}>
      {[0, 1].map((entry) => {
        const isFeatured = featured && entry === 0;
        return (
          <SkeletonPanel key={entry} data-ui="portfolio-entry-skeleton">
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: isFeatured
                  ? {
                      xs: 'minmax(0, 1fr)',
                      sm: '150px minmax(0, 1fr)',
                      lg: '180px minmax(0, 1fr) 280px',
                    }
                  : { xs: 'minmax(0, 1fr)', sm: '48px minmax(0, 1fr) auto' },
                gap: isFeatured ? { xs: 2, md: 3 } : { xs: 1.5, sm: 2.5 },
                alignItems: 'start',
              }}
            >
              <ContentSkeleton
                variant="rounded"
                width={isFeatured ? 150 : 48}
                height={isFeatured ? 150 : 48}
                sx={{ display: { xs: 'none', sm: 'block' } }}
              />
              <EntryBodySkeleton featured={isFeatured} />
              {isFeatured ? (
                <Box
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    gridColumn: { xs: '1 / -1', lg: 'auto' },
                  }}
                >
                  <EntryActionsSkeleton />
                </Box>
              ) : (
                <SkeletonButton width={145} />
              )}
            </Box>
          </SkeletonPanel>
        );
      })}
    </Stack>
  );
}

export default function PortfolioSkeleton() {
  const t = useTranslations('portfolio');
  const app = useTranslations('app');
  return (
    <Stack data-ui="portfolio-skeleton" sx={{ gap: { xs: 2.5, md: 3 } }}>
      <PageHeader title={t('title')} subtitle={t('subtitle')} note={app('paperNotes.portfolio')} />
      <StatTilesSkeleton
        labels={['savedPieces', 'totalWords', 'withFeedback', 'revisionCount'].map((key) => t(key))}
      />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) auto auto' },
          gap: 1.5,
          p: 1.5,
          border: 1,
          borderColor: 'divider',
          borderRadius: 3,
        }}
      >
        <ContentSkeleton variant="rounded" height={40} />
        <Stack direction="row" sx={{ gap: 0.75 }}>
          {[65, 90, 95].map((width) => (
            <ContentSkeleton key={width} variant="rounded" width={width} height={34} />
          ))}
        </Stack>
        <ContentSkeleton variant="rounded" width={170} height={40} />
      </Box>
      <PortfolioEntriesSkeleton />
    </Stack>
  );
}
