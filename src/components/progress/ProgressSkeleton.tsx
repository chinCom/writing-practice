'use client';

import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import SectionPanel from '@/components/shared/SectionPanel';
import PageHeader from '@/components/shared/PageHeader';
import StatTilesSkeleton from '@/components/shared/StatTilesSkeleton';
import OverviewCard from './OverviewCard';
import {
  ContentSkeleton,
  SkeletonButton,
  SkeletonLines,
  SkeletonPanel,
  SkeletonText,
} from '@/components/shared/ContentSkeleton';

function CourseTrackSkeleton() {
  return (
    <SkeletonPanel>
      <Stack direction="row" sx={{ gap: 1.25, alignItems: 'center' }}>
        <ContentSkeleton variant="rounded" width={40} height={40} />
        <Box sx={{ flex: 1 }}>
          <SkeletonText variant="h3" width="60%" />
          <SkeletonText variant="body2" width="50%" />
        </Box>
      </Stack>
      <ContentSkeleton variant="rounded" height={4} />
      <SkeletonText variant="body2" width="85%" />
      <SkeletonText variant="body2" width="65%" />
      <SkeletonButton width="100%" />
    </SkeletonPanel>
  );
}

function CalendarSkeleton() {
  return (
    <SkeletonPanel>
      <SkeletonText variant="h3" width="60%" />
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.5 }}>
        {Array.from({ length: 7 }, (_, day) => (
          <SkeletonText key={day} variant="caption" />
        ))}
        {Array.from({ length: 30 }, (_, day) => (
          <ContentSkeleton
            key={day}
            variant="rounded"
            sx={{ aspectRatio: '1', blockSize: 'auto' }}
          />
        ))}
      </Box>
    </SkeletonPanel>
  );
}

function TargetCardsSkeleton() {
  const t = useTranslations('progress.targets');
  return (
    <SectionPanel title={t('title')} description={t('provisional')}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 19rem), 1fr))',
          gap: 1.5,
        }}
      >
        {[0, 1, 2].map((target) => (
          <SkeletonPanel key={target} sx={{ p: 2 }}>
            <SkeletonText variant="subtitle1" width="75%" />
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
              {[0, 1].map((count) => (
                <Box key={count} sx={{ p: 1.25 }}>
                  <SkeletonText variant="caption" />
                  <SkeletonText variant="body2" width="80%" />
                </Box>
              ))}
            </Box>
            <SkeletonText variant="caption" />
            <SkeletonText variant="caption" width="70%" />
          </SkeletonPanel>
        ))}
      </Box>
      <Typography variant="body2" color="text.secondary">
        {t('rule')}
      </Typography>
    </SectionPanel>
  );
}

function BenchmarksSkeleton() {
  const t = useTranslations('progress');
  return (
    <SectionPanel title={t('benchmarksTitle')}>
      <Stack sx={{ gap: 1 }}>
        <SkeletonText variant="h3" width="50%" />
        <SkeletonText variant="caption" width={120} />
        {[0, 1].map((line) => (
          <SkeletonText key={line} width="65%" />
        ))}
        <SkeletonLines widths={['75%', '80%', '70%']} variant="body2" />
        <SkeletonText variant="subtitle1" width="55%" />
        <SkeletonLines widths={['80%', '90%', '70%', '85%']} variant="body2" />
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {t('benchmarkDisclaimer')}
      </Typography>
    </SectionPanel>
  );
}

function ImprovementSkeleton() {
  const t = useTranslations('progress');
  return (
    <SectionPanel title={t('improvementTitle')}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))',
          gap: 3,
        }}
      >
        {[300, 260].map((height) => (
          <Stack key={height} sx={{ gap: 1 }}>
            <SkeletonText variant="h3" width="60%" />
            <SkeletonText variant="body2" />
            <ContentSkeleton variant="rectangular" height={height} />
          </Stack>
        ))}
      </Box>
      <SkeletonLines variant="body2" widths={['90%', '80%', '65%']} />
    </SectionPanel>
  );
}

function ReviewInsightsSkeleton() {
  const t = useTranslations('progress');
  return (
    <SectionPanel title={t('insights')} description={t('insightNote')}>
      {[0, 1, 2].map((row) => (
        <Box
          key={row}
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 2,
            paddingBlock: 1,
          }}
        >
          <SkeletonText variant="body2" />
          <SkeletonText variant="body2" />
          <SkeletonText variant="body2" />
        </Box>
      ))}
    </SectionPanel>
  );
}

export function ProgressPanelsSkeleton() {
  const t = useTranslations('progress');
  return (
    <Stack data-ui="progress-panels-skeleton" sx={{ gap: 3 }}>
      <StatTilesSkeleton labels={['words', 'sessions', 'streak', 'xp'].map((key) => t(key))} />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(3, minmax(0, 1fr))' },
          gap: 2,
        }}
      >
        {(
          [
            ['targets', 'targets.title', 'targetsBody'],
            ['bars', 'benchmarksTitle', 'benchmarksBody'],
            ['trend', 'improvementTitle', 'improvementBody'],
          ] as const
        ).map(([illustration, title, body]) => (
          <OverviewCard
            key={illustration}
            illustration={illustration}
            title={t(title)}
            body={t('overview.' + body)}
          >
            <SkeletonText variant="caption" width="65%" />
          </OverviewCard>
        ))}
      </Box>
      <Stack sx={{ gap: 2 }}>
        <SkeletonText variant="h2" width={280} />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))',
            gap: 3,
          }}
        >
          <CourseTrackSkeleton />
        </Box>
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 18rem), 1fr))',
          gap: 3,
          alignItems: 'start',
        }}
      >
        <SkeletonPanel>
          <SkeletonText variant="h3" width="65%" />
          <ContentSkeleton variant="rectangular" height={260} />
          <SkeletonText variant="caption" width="80%" />
        </SkeletonPanel>
        <SkeletonPanel>
          <SkeletonText variant="h3" width="65%" />
          {[0, 1, 2, 3].map((row) => (
            <Stack key={row} sx={{ gap: 1 }}>
              <SkeletonText variant="body2" width="60%" />
              <ContentSkeleton variant="rounded" height={6} />
            </Stack>
          ))}
        </SkeletonPanel>
        <CalendarSkeleton />
      </Box>
      <Typography variant="h2">{t('overview.evidence')}</Typography>
      <Typography variant="body2" color="text.secondary">
        {t('overview.evidenceIntro')}
      </Typography>
      <TargetCardsSkeleton />
      <BenchmarksSkeleton />
      <ImprovementSkeleton />
      <ReviewInsightsSkeleton />
      <Typography variant="body2" color="text.secondary">
        {t('xpNote')}
      </Typography>
    </Stack>
  );
}

export default function ProgressSkeleton() {
  const t = useTranslations('progress');
  const app = useTranslations('app');
  return (
    <Stack data-ui="progress-skeleton" sx={{ gap: { xs: 2.5, md: 3 } }}>
      <PageHeader title={t('title')} subtitle={t('subtitle')} note={app('paperNotes.progress')} />
      <ProgressPanelsSkeleton />
    </Stack>
  );
}
