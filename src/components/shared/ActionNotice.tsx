'use client';
import type { ReactNode } from 'react';
import Alert, { type AlertProps } from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

export type ActionNoticeProps = Omit<AlertProps, 'children' | 'action'> & {
  message: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
};

/** Consistent notice/action placement; callers retain the severity, copy and retry policy. */
export default function ActionNotice({
  message,
  action,
  children,
  severity = 'error',
  sx = [],
  ref,
  ...props
}: ActionNoticeProps) {
  return (
    <Alert
      {...props}
      ref={ref}
      severity={severity}
      data-ui="action-notice"
      sx={[{ minInlineSize: 0, '& > *': { minInlineSize: 0 } }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      <Stack sx={{ gap: 1 }}>
        <Stack direction="row" sx={{ flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ flex: '1 1 16rem', minInlineSize: 0, overflowWrap: 'break-word' }}>
            {message}
          </Box>
          {action ? <Box sx={{ minInlineSize: 0 }}>{action}</Box> : null}
        </Stack>
        {children}
      </Stack>
    </Alert>
  );
}
