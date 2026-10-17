'use client';

import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';

const drawings = {
  home: 'M3 10.5 12 3l9 7.5M5.5 9v12h5v-7h3v7h5V9',
  map: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16',
  pencil: 'm4 16 12-12 4 4L8 20l-5 1 1-5Zm10-10 4 4M4 16l4 4',
  practice: 'm4 4 16 16M2.5 6.5l4-4m-3 7 6-6m5 17 6-6m-3 7 4-4',
  document: 'M5 2.5h9l5 5v14H5v-19Zm9 0v5h5M8.5 12h7m-7 4h7',
  settings:
    'm9 3 1-1h4l1 3 3 1 2-1 2 4-2 2v3l2 2-2 4-3-1-2 1-1 3h-4l-1-3-3-1-2 1-2-4 2-2v-3L2 8l2-4 3 1 2-2Zm6 9a3 3 0 1 0-6 0 3 3 0 0 0 6 0',
  target: 'M20 10a8 8 0 1 1-6-6M16 10a4 4 0 1 1-6-2m2 4 8-8m-4 0h4v4',
  globe:
    'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M5 6.5h14M5 17.5h14M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z',
  crown: 'm2 6 5 5 5-8 5 8 5-5-3 15H5L2 6Z',
  sparkles:
    'm9 7 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Zm9-6 1.2 3.8L23 6l-3.8 1.2L18 11l-1.2-3.8L13 6l3.8-1.2L18 1Z',
  people:
    'M15 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm-9 13v-3a5 5 0 0 1 10 0v3M19 4a3 3 0 0 1 0 6m0 4a5 5 0 0 1 3 4v3',
  list: 'M9 5h12M9 12h12M9 19h12M3 4h2v2H3V4Zm0 7h2v2H3v-2Zm0 7h2v2H3v-2Z',
  chat: 'M4 3h16a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H8l-5 4V4a1 1 0 0 1 1-1Z',
  star: 'm12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z',
  book: 'M12 5C9 3 5 3 2 4v16c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v16',
  trend: 'm2 18 7-7 5 4 8-12m-6 0h6v6',
  check: 'm4 12 5 5L20 5',
  checkCircle: 'M21 12a9 9 0 1 1-3-6.7M7 12l4 4L21 5',
} as const;

export type BoardIconName = keyof typeof drawings | 'bars';

export default function BoardIcon({ name, ...props }: SvgIconProps & { name: BoardIconName }) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      {name === 'bars' ? (
        <path d="M3 11h4v10H3V11Zm7-8h4v18h-4V3Zm7 12h4v6h-4v-6Z" fill="currentColor" />
      ) : (
        <path
          d={drawings[name]}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </SvgIcon>
  );
}
