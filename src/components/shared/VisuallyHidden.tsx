'use client';
import Box, { type BoxProps } from '@mui/material/Box';

const visuallyHidden = {
  position: 'absolute',
  inlineSize: 1,
  blockSize: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;

export type VisuallyHiddenProps = Omit<BoxProps, 'sx'> & {
  component?: React.ElementType;
};

/** Text that assistive technology announces but the page does not show. */
export default function VisuallyHidden({
  component = 'span',
  children,
  ...props
}: VisuallyHiddenProps) {
  return (
    <Box {...props} component={component} sx={visuallyHidden}>
      {children}
    </Box>
  );
}
