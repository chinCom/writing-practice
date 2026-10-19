'use client';

import Landing from './Landing';
import Box from '@mui/material/Box';

export default function LandingSkeleton() {
  return (
    <Box data-ui="landing-skeleton">
      <Landing loading />
    </Box>
  );
}
