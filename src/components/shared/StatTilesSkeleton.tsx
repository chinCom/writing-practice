'use client';

import Box from '@mui/material/Box';
import StatTile from './StatTile';
import { ContentSkeleton } from './ContentSkeleton';

export default function StatTilesSkeleton({ labels }: { labels: string[] }) {
  return (
    <Box
      data-ui="stat-tiles-skeleton"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
        gap: 2,
      }}
    >
      {labels.map((label) => (
        <StatTile
          key={label}
          label={label}
          icon={<ContentSkeleton variant="rounded" width={24} height={24} />}
          value={<ContentSkeleton variant="text" width={60} sx={{ blockSize: '1lh' }} />}
        />
      ))}
    </Box>
  );
}
