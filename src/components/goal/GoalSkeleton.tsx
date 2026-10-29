'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { ContentSkeleton, SkeletonLines, SkeletonText } from '@/components/shared/ContentSkeleton';

/** The goal overview's shape: headline, estimate bar, four skills and the week. */
export default function GoalSkeleton() {
  return (
    <Stack data-ui="goal-skeleton" sx={{ gap: 2 }}>
      <SkeletonText variant="h3" width="55%" />
      <ContentSkeleton variant="rounded" height={8} />
      <SkeletonText variant="body2" width="85%" />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
        {[0, 1, 2, 3].map((skill) => (
          <Stack key={skill} sx={{ gap: 0.25 }}>
            <SkeletonText variant="caption" width="45%" />
            <ContentSkeleton variant="rounded" height={4} />
          </Stack>
        ))}
      </Box>
      <SkeletonLines variant="body2" widths={['40%', '60%', '50%']} />
    </Stack>
  );
}
