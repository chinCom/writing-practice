'use client';

import Box from '@mui/material/Box';

/** Broad, translucent paper ribbons from the reference board, behind the live UI. */
export default function BackdropRibbons({ expansive = false }: { expansive?: boolean }) {
  return (
    <Box
      component="svg"
      aria-hidden="true"
      viewBox={expansive ? '0 0 1440 1080' : '0 0 1440 700'}
      preserveAspectRatio="none"
      sx={{
        position: 'absolute',
        inset: 0,
        inlineSize: '100%',
        blockSize: expansive ? '100%' : 700,
        pointerEvents: 'none',
        color: 'secondary.main',
        opacity: (theme) => (theme.palette.mode === 'dark' ? 0.1 : 0.035),
        overflow: 'clip',
      }}
    >
      <path
        d="M760 1040C720 650 940 440 1120 280S1260 90 1150-80"
        fill="none"
        stroke="currentColor"
        strokeWidth="310"
      />
      <path
        d="M520 900C700 440 910 310 1100 320S1340 160 1420-60"
        fill="none"
        stroke="currentColor"
        strokeWidth="220"
        opacity="0.55"
      />
      {expansive ? (
        <path
          d="M220 1190C480 700 530 1050 810 1140S1220 980 1530 720"
          fill="none"
          stroke="currentColor"
          strokeWidth="200"
          opacity="0.55"
        />
      ) : null}
    </Box>
  );
}
