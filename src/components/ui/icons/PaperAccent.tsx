'use client';

import { useId, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

export type PaperIllustration =
  'paper' | 'travel' | 'stack' | 'pen' | 'crown' | 'targets' | 'bars' | 'trend';

function InkStrokes() {
  return (
    <>
      <path
        d="m159 28-3-14m20 12 7-18m7 32 19-12"
        fill="none"
        stroke="var(--mui-palette-secondary-main)"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <path
        d="m201 62 21-4m-20 24 16 5"
        fill="none"
        stroke="var(--mui-palette-success-main)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </>
  );
}

function Sheet({ fill }: { fill: string }) {
  return (
    <g transform="rotate(10 112 112)">
      <rect x="53" y="42" width="128" height="135" rx="9" fill={fill} />
      <path
        d="M73 64h36"
        stroke="var(--mui-palette-secondary-main)"
        strokeOpacity="0.3"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M73 83h86m-86 16h80m-80 16h66m-66 16h70m-70 16h53"
        stroke="var(--mui-palette-secondary-main)"
        strokeOpacity="0.26"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </g>
  );
}

function TravelDrawing({ fill }: { fill: string }) {
  return (
    <>
      <g transform="rotate(-5 100 105)">
        <rect x="39" y="15" width="126" height="158" rx="8" fill={fill} />
        <rect x="47" y="23" width="110" height="142" rx="3" fill="var(--mui-palette-pastel-blue)" />
        <circle cx="136" cy="45" r="10" fill="var(--mui-palette-highlighter-main)" />
        <path
          d="m47 108 28-65 28 49 19-31 35 53v51H47Z"
          fill="var(--mui-palette-text-secondary)"
          opacity="0.3"
        />
        <path
          d="m57 85 18-42 12 23-9-5-5 11-5-6-11 19Zm48 7 17-31 16 24-14-7-6 10-6-3-7 7Z"
          fill={fill}
          opacity="0.8"
        />
        <path
          d="m47 122 27-38 27 37 22-27 34 31v40H47Z"
          fill="var(--mui-palette-success-dark)"
          opacity="0.35"
        />
        <path
          d="M47 145c40-32 69-24 110-35v55H47Z"
          fill="var(--mui-palette-success-main)"
          opacity="0.48"
        />
        <path d="M79 165c11-29 43-27 51-42-1 19-21 25-26 42" fill={fill} opacity="0.55" />
        <path
          d="m48 165 6-23 1 16 7-25-1 32m65 0 8-23-1 17 10-29-2 35m5 0 6-17-1 17"
          fill="none"
          stroke="var(--mui-palette-success-dark)"
          strokeWidth="4"
          opacity="0.55"
        />
      </g>
      <g transform="translate(68 74) rotate(9 112 112) scale(.68)">
        <Sheet fill={fill} />
      </g>
      <path
        d="m185 66 5-14m6 26 15-10m-13 26 13 3"
        fill="none"
        stroke="var(--mui-palette-primary-main)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </>
  );
}

function MiniDrawing({ kind, fill }: { kind: PaperIllustration; fill: string }) {
  return (
    <g transform="rotate(-10 115 100)">
      <rect x="55" y="40" width="125" height="125" rx="17" fill={fill} />
      {kind === 'bars' ? (
        <path
          d="M83 117V98m30 19V78m30 39V60"
          stroke="var(--mui-palette-secondary-main)"
          strokeWidth="10"
          strokeLinecap="round"
        />
      ) : kind === 'trend' ? (
        <path
          d="m75 130 26-27 20 13 32-39m-15 1 15-1-1 15"
          fill="none"
          stroke="var(--mui-palette-success-main)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <>
          <path
            d="m75 73 3 4 6-7m-9 28 3 4 6-7m-9 28 3 4 6-7"
            fill="none"
            stroke="var(--mui-palette-secondary-main)"
            strokeWidth="3"
          />
          <path
            d="M97 73h58m-58 25h43m-43 25h50"
            stroke="var(--mui-palette-secondary-main)"
            strokeOpacity="0.25"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle cx="172" cy="150" r="19" fill="var(--mui-palette-success-main)" />
          <path
            d="m162 150 7 7 12-13"
            stroke={fill}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )}
    </g>
  );
}

/** Separate illustrations preserve the single-sheet, travel, and pen motifs in the board. */
export default function PaperAccent({
  inlineSize = 420,
  blockSize = 176,
  note,
  kind = 'paper',
  sx,
}: {
  inlineSize?: number;
  blockSize?: number;
  note?: ReactNode;
  kind?: PaperIllustration;
  sx?: SxProps<Theme>;
}) {
  const id = useId().replace(/:/g, '');
  const fill = `url(#paper-${id})`;
  const small = ['targets', 'bars', 'trend'].includes(kind);
  return (
    <Box
      aria-hidden="true"
      sx={[
        {
          position: 'relative',
          inlineSize,
          blockSize,
          flexShrink: 0,
          pointerEvents: 'none',
          display: { xs: 'none', md: 'block' },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box
        component="svg"
        viewBox={note ? (kind === 'paper' ? '0 0 420 190' : '0 0 310 190') : '20 0 220 190'}
        sx={{
          inlineSize: '100%',
          blockSize: '100%',
          overflow: 'visible',
          filter:
            'drop-shadow(0 9px 12px color-mix(in srgb, var(--mui-palette-secondary-main) 12%, transparent))',
        }}
      >
        <defs>
          <linearGradient id={`paper-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="var(--mui-palette-background-paper)" />
            <stop offset="1" stopColor="var(--mui-palette-background-default)" />
          </linearGradient>
        </defs>
        {kind === 'travel' ? (
          <TravelDrawing fill={fill} />
        ) : small ? (
          <MiniDrawing kind={kind} fill={fill} />
        ) : (
          <>
            {kind === 'stack' ? (
              <g transform="translate(-20 15) rotate(-30 112 112)" opacity="0.65">
                <Sheet fill={fill} />
              </g>
            ) : null}
            <Sheet fill={fill} />
            {kind === 'pen' ? (
              <>
                <path
                  d="m148 139 57-104 12 7-57 104-14 12 2-19Z"
                  fill="var(--mui-palette-secondary-main)"
                />
                <path
                  d="m157 135 52-94"
                  stroke="var(--mui-palette-pastel-lilac)"
                  strokeOpacity="0.5"
                  strokeWidth="4"
                />
                <path
                  d="M68 147q48-33 33-3t24 11q11-9 18 5"
                  fill="none"
                  stroke="var(--mui-palette-secondary-main)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </>
            ) : kind === 'crown' ? (
              <path
                d="m158 45-8-32 20 12 7-24 13 22 19-13-9 36Z"
                fill="var(--mui-palette-secondary-main)"
                opacity="0.8"
              />
            ) : (
              <InkStrokes />
            )}
          </>
        )}
      </Box>
      {note ? (
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            insetBlockStart: 15,
            insetInlineEnd: 20,
            inlineSize: 125,
            fontFamily: 'var(--font-handwriting), cursive',
            fontSize: '1.45rem',
            fontWeight: 500,
            lineHeight: 1,
            color: 'primary.main',
            textAlign: 'center',
            whiteSpace: 'pre-line',
            transform: 'rotate(-11deg)',
          }}
        >
          {note}
        </Typography>
      ) : null}
    </Box>
  );
}
