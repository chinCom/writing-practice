'use client';

import type { ReactNode } from 'react';
import NextLink from 'next/link';
import Paper from '@mui/material/Paper';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import type { SxProps, Theme } from '@mui/material/styles';

export type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
  href?: string;
  disabled?: boolean;
};

// Fast first, long deceleration. The pill travels quickly and settles softly.
const slideEase = 'cubic-bezier(0.16, 1, 0.3, 1)';

/**
 * A segmented control with a sliding pill. Options may navigate with `href` or report through
 * `onChange`. The paper wrapper keeps the empty track visible behind the moving pill.
 */
export default function SegmentedControl<T extends string>({
  value,
  options,
  ariaLabel,
  onChange,
  sx,
}: {
  value: T;
  options: readonly SegmentedOption<T>[];
  ariaLabel: string;
  onChange?: (value: T) => void;
  sx?: SxProps<Theme>;
}) {
  return (
    <Paper
      sx={[
        { p: 0.75, bgcolor: 'tonal.primary', borderRadius: 3, boxShadow: 'none' },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Tabs
        value={value}
        variant="fullWidth"
        aria-label={ariaLabel}
        onChange={(_, next: T) => onChange?.(next)}
        sx={{ minHeight: 46 }}
        slotProps={{
          indicator: {
            sx: {
              height: 'auto',
              insetBlockStart: 4,
              insetBlockEnd: 4,
              borderRadius: '999px',
              bgcolor: 'background.paper',
              boxShadow: 1,
              zIndex: 0,
              '@media (prefers-reduced-motion: no-preference)': {
                transition: `left 380ms ${slideEase}, width 380ms ${slideEase}`,
              },
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            },
          },
        }}
      >
        {options.map((option) => (
          <Tab
            key={option.value}
            value={option.value}
            label={option.label}
            disabled={option.disabled}
            wrapped
            sx={{ minWidth: 0 }}
            {...(option.href ? { component: NextLink, href: option.href } : {})}
          />
        ))}
      </Tabs>
    </Paper>
  );
}
