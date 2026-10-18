'use client';

import type { ReactNode } from 'react';
import Stack, { type StackProps } from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import IconBadge from './IconBadge';

export type StatTileProps = Omit<StackProps, 'children'> & {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  tone?: 'purple' | 'blue' | 'amber';
};

/**
 * A compact number tile for portfolio and progress summaries.
 */
export default function StatTile({
  label,
  value,
  icon,
  hint,
  tone = 'purple',
  role,
  sx = [],
  ref,
  ...props
}: StatTileProps) {
  return (
    <Stack
      {...props}
      ref={ref}
      data-ui="stat-tile"
      direction="row"
      role={role ?? 'group'}
      aria-label={label}
      sx={[
        {
          alignItems: 'center',
          gap: 2,
          p: { xs: 2, md: 2.25 },
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: 2.5,
          minInlineSize: 0,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {icon ? <IconBadge tone={tone}>{icon}</IconBadge> : null}
      <Box sx={{ minInlineSize: 0 }}>
        <Typography variant="h3" component="p" sx={{ fontSize: '1.5rem', lineHeight: 1.1 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {label}
        </Typography>
        {hint ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
            {hint}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );
}
