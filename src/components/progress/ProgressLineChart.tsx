'use client';

import { lazy, Suspense } from 'react';
import type { LineChartProps } from '@mui/x-charts/LineChart';
import useMediaQuery from '@mui/material/useMediaQuery';
import { ContentSkeleton } from '@/components/shared/ContentSkeleton';

const LineChart = lazy(() =>
  import('@mui/x-charts/LineChart').then((module) => ({ default: module.LineChart })),
);

/** Keep chart code and hydration inside its own boundary; reserve the final plot height. */
export default function ProgressLineChart(props: LineChartProps) {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  return (
    <Suspense fallback={<ContentSkeleton variant="rectangular" height={props.height ?? 260} />}>
      <LineChart {...props} skipAnimation={props.skipAnimation ?? reducedMotion} />
    </Suspense>
  );
}
