'use client';

import { useId } from 'react';
import SvgIcon from '@mui/material/SvgIcon';
import type { SvgIconProps } from '@mui/material/SvgIcon';

/**
 * The feather-quill brand mark. The gradient is scoped with useId so repeated marks never collide.
 */
export default function LogoMark(props: SvgIconProps) {
  const gradientId = useId().replace(/:/g, '');
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1="4"
          y1="22"
          x2="21"
          y2="2"
        >
          <stop offset="0" stopColor="var(--mui-palette-secondary-main)" />
          <stop offset="1" stopColor="var(--mui-palette-secondary-main)" stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <path
        d="M21.2 2.5c-.3-.4-1.3-.4-2.2-.2-7.8 1.3-13 5.5-14.7 12.3-.5 1.9-.4 3.7.2 4.8 1.6.2 3.6-.1 5.1-.7 6.3-2.3 10-7.9 11.4-14.8.1-.6.3-1.2.2-1.4Z"
        fill={`url(#${gradientId})`}
      />
      <path
        d="M2 23c2-6 5-10 10-13"
        fill="none"
        stroke="var(--mui-palette-secondary-main)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M2.6 21.6c1.3-5.1 4.4-9.2 9.2-11.9"
        fill="none"
        stroke="var(--mui-palette-primary-contrastText)"
        strokeLinecap="round"
        strokeWidth="1.35"
        opacity="0.9"
      />
      <path
        d="m14.3 8.6 3-2.1M12.7 11.9l3.6-1.6M11.2 15.2l3.2-1.2"
        fill="none"
        stroke="var(--mui-palette-primary-contrastText)"
        strokeLinecap="round"
        strokeWidth="1"
        opacity="0.75"
      />
    </SvgIcon>
  );
}
