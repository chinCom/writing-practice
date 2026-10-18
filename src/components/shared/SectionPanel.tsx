'use client';
import { useId, type ReactNode } from 'react';
import Paper, { type PaperProps } from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export type SectionPanelProps = Omit<PaperProps, 'title'> & {
  title: ReactNode;
  titleId?: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  headingComponent?: 'h2' | 'h3' | 'h4';
};

/** A named workspace section with shared spacing and a wrapping header/action row. */
export default function SectionPanel({
  title,
  titleId,
  description,
  icon,
  action,
  headingComponent = 'h2',
  children,
  sx = [],
  ref,
  ...props
}: SectionPanelProps) {
  const generatedId = useId();
  const headingId = titleId ?? generatedId;
  return (
    <Paper
      component="section"
      aria-labelledby={headingId}
      {...props}
      ref={ref}
      data-ui="section-panel"
      sx={[{ p: { xs: 2.5, md: 3 }, minInlineSize: 0 }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      <Stack sx={{ gap: 2 }}>
        <Stack direction="row" sx={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 1.5 }}>
          {icon}
          <Box sx={{ flex: '1 1 12rem', minInlineSize: 0 }}>
            <Typography
              id={headingId}
              component={headingComponent}
              variant="h3"
              sx={{ overflowWrap: 'break-word' }}
            >
              {title}
            </Typography>
            {description ? (
              <Typography variant="body2" color="text.secondary" sx={{ marginBlockStart: 0.75 }}>
                {description}
              </Typography>
            ) : null}
          </Box>
          {action ? <Box sx={{ minInlineSize: 0 }}>{action}</Box> : null}
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}
