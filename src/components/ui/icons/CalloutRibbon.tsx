'use client';

import Box from '@mui/material/Box';

/** Quiet amber folds in the corners of review and account callouts. */
export default function CalloutRibbon() {
  return (
    <Box
      component="svg"
      aria-hidden="true"
      viewBox="0 0 200 120"
      preserveAspectRatio="none"
      sx={{
        position: 'absolute',
        insetInlineEnd: 0,
        insetBlock: 0,
        inlineSize: 200,
        blockSize: '100%',
        color: 'highlighter.main',
        opacity: 0.23,
        pointerEvents: 'none',
      }}
    >
      <path
        d="M135-20c-20 57 67 33 68 77s-65 36-60 86"
        fill="none"
        stroke="currentColor"
        strokeWidth="35"
      />
      <path d="M224 15c-72 2-9 68-93 84" fill="none" stroke="currentColor" strokeWidth="14" />
    </Box>
  );
}
