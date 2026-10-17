'use client';

import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';

export default function HandDrawnArrow(props: SvgIconProps) {
  return (
    <SvgIcon viewBox="0 0 100 64" aria-hidden="true" {...props}>
      <path
        d="M81 5C80 37 45 59 15 44m15-7-16 7 13 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}
