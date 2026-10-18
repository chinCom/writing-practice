'use client';
import Box, { type BoxProps } from '@mui/material/Box';

const tones = {
  purple: { bgcolor: 'pastel.lilac', color: 'secondary.main' },
  blue: { bgcolor: 'pastel.blue', color: 'info.main' },
  amber: { bgcolor: 'pastel.sand', color: 'warning.main' },
  green: { bgcolor: 'pastel.mint', color: 'success.dark' },
  rose: { bgcolor: 'pastel.rose', color: 'error.main' },
} as const;
export type IconBadgeProps = BoxProps & {
  tone?: keyof typeof tones;
  size?: 'small' | 'medium';
};

/** Decorative icon treatment; the adjacent heading or label supplies its meaning. */
export default function IconBadge({
  tone = 'purple',
  size = 'medium',
  children,
  sx = [],
  ref,
  ...props
}: IconBadgeProps) {
  return (
    <Box
      aria-hidden="true"
      {...props}
      ref={ref}
      data-ui="icon-badge"
      sx={[
        {
          inlineSize: (theme) => theme.spacing(size === 'small' ? 5 : 6),
          blockSize: (theme) => theme.spacing(size === 'small' ? 5 : 6),
          borderRadius: 2,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          ...tones[tone],
          '& svg': { fontSize: (theme) => theme.spacing(size === 'small' ? 2.5 : 3) },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}
