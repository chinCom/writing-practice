'use client';

import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import PageHeader from '@/components/shared/PageHeader';
import SectionPanel from '@/components/shared/SectionPanel';
import {
  ContentSkeleton,
  SkeletonButton,
  SkeletonLines,
  SkeletonPanel,
  SkeletonText,
} from '@/components/shared/ContentSkeleton';

export function PracticeQuestionSkeleton() {
  return (
    <Box
      data-ui="practice-question-skeleton"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) 320px' },
        gap: 3,
        alignItems: 'start',
      }}
    >
      <Stack sx={{ gap: 2.5, minInlineSize: 0 }}>
        <SkeletonPanel>
          <Stack direction="row" sx={{ gap: 3, alignItems: 'center' }}>
            <SkeletonText variant="body2" width={130} />
            <ContentSkeleton variant="rounded" height={10} sx={{ flex: 1 }} />
          </Stack>
        </SkeletonPanel>
        <SkeletonPanel sx={{ p: { xs: 2.5, md: 3.5 } }}>
          <ContentSkeleton variant="rounded" width={130} height={34} />
          <SkeletonText variant="body2" width="75%" />
          <SkeletonLines variant="canvas" widths={['95%', '65%']} />
          <ContentSkeleton variant="rounded" height={56} />
          <SkeletonButton />
        </SkeletonPanel>
        <SkeletonPanel>
          <SkeletonText variant="subtitle1" width="60%" />
          <SkeletonLines variant="body2" widths={['85%', '70%']} />
        </SkeletonPanel>
      </Stack>
      <Stack sx={{ gap: 2 }}>
        <SkeletonPanel>
          <SkeletonText variant="h3" width="65%" />
          <SkeletonLines variant="body2" />
        </SkeletonPanel>
        <SkeletonPanel>
          <SkeletonText variant="h3" width="75%" />
          <SkeletonLines variant="body2" widths={['90%', '75%', '85%', '70%', '80%', '60%']} />
        </SkeletonPanel>
      </Stack>
    </Box>
  );
}

export function TransferQuestionSkeleton() {
  return (
    <Stack data-ui="transfer-question-skeleton" sx={{ gap: 2 }}>
      <SkeletonText variant="subtitle2" width={140} />
      <SkeletonLines variant="canvas" widths={['95%']} />
      <ContentSkeleton variant="rounded" height={56} />
      <SkeletonButton width={150} />
    </Stack>
  );
}

function TransferSkeleton() {
  const t = useTranslations('practice');
  return (
    <SectionPanel title={t('transferTitle')} description={t('transferBody')}>
      <TransferQuestionSkeleton />
    </SectionPanel>
  );
}

export default function PracticeSkeleton() {
  const t = useTranslations('practice');
  return (
    <Stack data-ui="practice-skeleton" sx={{ gap: 3 }}>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <PracticeQuestionSkeleton />
      <TransferSkeleton />
    </Stack>
  );
}
