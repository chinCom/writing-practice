'use client';

import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import PageHeader from '@/components/shared/PageHeader';
import {
  ContentSkeleton,
  SkeletonButton,
  SkeletonLines,
  SkeletonPanel,
  SkeletonText,
} from '@/components/shared/ContentSkeleton';

export default function LessonSkeleton() {
  return (
    <Container data-ui="lesson-skeleton" maxWidth="lg" disableGutters>
      <Stack sx={{ gap: { xs: 2.5, md: 3 } }}>
        <SkeletonButton width={150} />
        <PageHeader title={<SkeletonText variant="h1" width="65%" />} accentOffset={-82} />
        <SkeletonPanel padding={3}>
          <SkeletonText variant="h3" width={180} />
          <SkeletonLines widths={['92%']} />
          <SkeletonText variant="subtitle1" width={150} />
          <SkeletonLines variant="canvas" widths={['96%']} />
        </SkeletonPanel>
        <SkeletonPanel padding={3}>
          <SkeletonText variant="h3" width={180} />
          <SkeletonText variant="body2" width={120} />
          <SkeletonLines widths={['65%']} />
          <ContentSkeleton variant="rounded" height={56} />
          <SkeletonButton width="100%" />
        </SkeletonPanel>
      </Stack>
    </Container>
  );
}
