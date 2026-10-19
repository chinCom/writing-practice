'use client';

import type { TextFieldProps } from '@mui/material/TextField';
import WritingField from '@/components/shared/WritingField';

export default function PlacementSampleField({ sx = [], ...props }: TextFieldProps) {
  return (
    <WritingField
      {...props}
      fullWidth
      multiline
      minRows={3}
      sx={[
        {
          // Reserve the autosizer's three rounded line heights before hydration.
          '& textarea:not([aria-hidden])': {
            minBlockSize: 'calc(3 * round(nearest, 1lh, 1px))',
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
}
