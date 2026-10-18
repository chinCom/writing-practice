'use client';
import Typography, { type TypographyProps } from '@mui/material/Typography';

export type SectionTitleProps = Omit<TypographyProps, 'variant'>;

/** A section heading that keeps the workspace's heading level and type scale aligned. */
export default function SectionTitle({
  component = 'h2',
  sx = [],
  children,
  ...props
}: SectionTitleProps) {
  return (
    <Typography
      {...props}
      component={component}
      variant="h3"
      data-ui="section-title"
      sx={[{ color: 'text.primary' }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      {children}
    </Typography>
  );
}
