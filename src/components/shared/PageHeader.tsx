'use client';

import type { ReactNode } from 'react';
import Box, { type BoxProps } from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PaperAccent from '@/components/ui/icons/PaperAccent';
import { useTranslations } from 'next-intl';

export type PageHeaderProps = Omit<BoxProps, 'title' | 'children'> & {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
  accent?: boolean;
  accentOffset?: number;
  note?: ReactNode;
};

/**
 * The page opening used across the workspace: an editorial serif title and a quiet paper illustration.
 * The illustration is decorative and never displaces the heading on small screens.
 */
export default function PageHeader({
  title,
  subtitle,
  eyebrow,
  action,
  accent = true,
  accentOffset = -22,
  note,
  sx = [],
  ref,
  ...props
}: PageHeaderProps) {
  const app = useTranslations('app');
  return (
    <Box
      component="header"
      {...props}
      ref={ref}
      data-ui="page-header"
      sx={[
        {
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          mb: { xs: 2, md: 3 },
          minBlockSize: { md: 100 },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Stack sx={{ gap: 1.25, minInlineSize: 0, flex: 1 }}>
        {eyebrow ? (
          <Typography variant="eyebrow" color="secondary.main">
            {eyebrow}
          </Typography>
        ) : null}
        <Typography component="h1" variant="h1" sx={{ textWrap: 'balance', color: 'primary.main' }}>
          {title}
        </Typography>
        {subtitle ? (
          <Box
            sx={{
              color: 'text.secondary',
              fontSize: { xs: '0.9375rem', md: '1.0625rem' },
              maxInlineSize: '62ch',
            }}
          >
            {subtitle}
          </Box>
        ) : null}
        {action ? <Box sx={{ mt: 1 }}>{action}</Box> : null}
      </Stack>
      {accent ? (
        <Box
          sx={{
            display: { xs: 'none', md: 'block' },
            position: 'absolute',
            insetBlockStart: accentOffset,
            insetInlineEnd: 0,
            zIndex: -1,
          }}
        >
          <PaperAccent note={note ?? app('paperNotes.default')} />
        </Box>
      ) : null}
    </Box>
  );
}
