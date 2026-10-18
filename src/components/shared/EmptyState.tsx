'use client';
import { useId, type ReactNode } from 'react';
import Paper, { type PaperProps } from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export type EmptyStateProps = Omit<PaperProps, 'title'> & {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
};

/** An honest empty/completed state with one clear next action, not a generic error. */
export default function EmptyState({
  title,
  description,
  icon,
  action,
  children,
  sx = [],
  ref,
  ...props
}: EmptyStateProps) {
  const headingId = useId();
  return (
    <Paper
      component="section"
      variant="outlined"
      aria-labelledby={headingId}
      {...props}
      ref={ref}
      data-ui="empty-state"
      sx={[{ p: { xs: 3, md: 4 }, minInlineSize: 0 }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      <Stack sx={{ gap: 2, alignItems: 'flex-start' }}>
        {icon}
        <Typography id={headingId} component="h2" variant="h2" sx={{ overflowWrap: 'break-word' }}>
          {title}
        </Typography>
        {description ? <Typography color="text.secondary">{description}</Typography> : null}
        {children}
        {action ? <Box sx={{ minInlineSize: 0 }}>{action}</Box> : null}
      </Stack>
    </Paper>
  );
}
