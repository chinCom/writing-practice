'use client';

import SvgIcon from '@mui/material/SvgIcon';

/**
 * A hand-drawn dashed arc with an arrowhead, used between the three landing steps.
 */
export default function StepConnector() {
  return (
    <SvgIcon
      aria-hidden="true"
      viewBox="0 0 220 64"
      sx={{ inlineSize: '100%', blockSize: 64, color: 'secondary.main', opacity: 0.45 }}
    >
      <path
        d="M4 40C50 18 112 18 158 40"
        fill="none"
        stroke="currentColor"
        strokeDasharray="5 8"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="m151 30 7 10-11 1"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </SvgIcon>
  );
}
