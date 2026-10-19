'use client';

import Stack from '@mui/material/Stack';
import { SkeletonButton, SkeletonText } from '@/components/shared/ContentSkeleton';

export default function ConnectionSkeleton() {
  return (
    <Stack data-ui="connection-skeleton" sx={{ gap: 2, alignItems: 'flex-start' }}>
      <SkeletonText variant="h1" width="75%" />
      <SkeletonButton width={180} />
      <SkeletonButton width={180} />
    </Stack>
  );
}
