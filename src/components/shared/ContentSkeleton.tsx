'use client';

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper, { type PaperProps } from '@mui/material/Paper';
import Skeleton, { type SkeletonProps } from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography, { type TypographyProps } from '@mui/material/Typography';
import VisuallyHidden from './VisuallyHidden';

/** MUI owns the shape and wave; reduced motion is applied before hydration too. */
export function ContentSkeleton({ sx = [], ...props }: SkeletonProps) {
  return (
    <Skeleton
      aria-hidden="true"
      animation="wave"
      {...props}
      sx={[
        {
          '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
            '&::after': { animation: 'none', display: 'none' },
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
}

export function SkeletonText({
  variant = 'body1',
  width = '100%',
}: {
  variant?: TypographyProps['variant'];
  width?: number | string;
}) {
  return (
    <Typography
      component="span"
      variant={variant}
      sx={{ display: 'block', inlineSize: width, maxInlineSize: '100%', minInlineSize: 0 }}
    >
      <ContentSkeleton
        variant="text"
        width="100%"
        sx={{ maxInlineSize: '100%', blockSize: '1lh' }}
      />
    </Typography>
  );
}

/** Infer a placeholder's footprint from the same markup used by the loaded view. */
export function SkeletonMask({
  loading,
  children,
  variant = 'text',
}: {
  loading: boolean;
  children: ReactNode;
  variant?: SkeletonProps['variant'];
}) {
  if (!loading) return children;
  return (
    <ContentSkeleton variant={variant} width="100%">
      <Box>{children}</Box>
    </ContentSkeleton>
  );
}

export function SkeletonLines({
  widths = ['100%', '96%', '72%'],
  variant = 'body1',
}: {
  widths?: string[];
  variant?: TypographyProps['variant'];
}) {
  return (
    <Box>
      {widths.map((width, index) => (
        <SkeletonText key={index} variant={variant} width={width} />
      ))}
    </Box>
  );
}

export function SkeletonButton({ width = 160 }: { width?: number | string }) {
  return (
    <ContentSkeleton
      variant="rounded"
      width={width}
      height={44}
      sx={{ maxInlineSize: '100%', flexShrink: 0 }}
    />
  );
}

export function SkeletonPanel({
  children,
  padding = { xs: 2.5, md: 3 },
  sx = [],
  ...props
}: PaperProps & { padding?: number | { xs?: number; sm?: number; md?: number } }) {
  return (
    <Paper
      variant="outlined"
      {...props}
      sx={[{ p: padding, minInlineSize: 0 }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      <Stack sx={{ gap: 2 }}>{children}</Stack>
    </Paper>
  );
}

export function LoadingContent({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box data-ui="loading-content" aria-busy="true">
      <VisuallyHidden component="p" role="status" aria-live="polite">
        {label}
      </VisuallyHidden>
      <Box aria-hidden="true" inert>
        {children}
      </Box>
    </Box>
  );
}
