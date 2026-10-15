'use client';
import { useMemo, type RefObject } from 'react';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { keyframes, type Theme } from '@mui/material/styles';
import TextOverlay, { type Band } from './TextOverlay';
import { readingSchedule, type LineTiming } from '@/lib/reading-schedule';

type InputRef = RefObject<HTMLTextAreaElement | null>;

const holdMs = 600;
const fadeMs = 400;
const restMs = 300;

// Every band shares one loop. A band wipes only during its own slot of the reading pass,
// so the highlight moves through the paragraph in reading order.
function bandSweep(line: LineTiming, cycle: number) {
  const percent = (ms: number) => (ms / cycle) * 100;
  const readEnd = cycle - holdMs - fadeMs - restMs;
  return keyframes`
    0%, ${percent(line.start)}% { clip-path: inset(0 100% 0 0); opacity: 0.55; }
    ${percent(line.start + line.duration)}% { clip-path: inset(0 0 0 0); opacity: 0.55; }
    ${percent(readEnd + holdMs)}% { clip-path: inset(0 0 0 0); opacity: 0.55; }
    ${percent(readEnd + holdMs + fadeMs)}%, 100% { clip-path: inset(0 0 0 0); opacity: 0; }
  `;
}

// Dark mode needs a weaker yellow so light text keeps its contrast on top of it.
export const highlighterBand = [
  { position: 'absolute', bgcolor: 'highlighter.main', borderRadius: 0.5 },
  (theme: Theme) =>
    theme.applyStyles('dark', {
      bgcolor: `color-mix(in srgb, ${theme.vars.palette.highlighter.main} 55%, transparent)`,
    }),
] as const;

export default function ReadSweep(props: { inputRef: InputRef; text: string }) {
  const animate = useMediaQuery('(prefers-reduced-motion: no-preference)');
  return animate ? (
    <TextOverlay data-read-sweep aria-hidden="true" {...props}>
      {({ bands }) => <SweepBands bands={bands} />}
    </TextOverlay>
  ) : null;
}

function SweepBands({ bands }: { bands: Band[] }) {
  const { cycle, sweeps } = useMemo(() => {
    const { total, lines } = readingSchedule(bands.map((band) => band.width));
    const cycle = total + holdMs + fadeMs + restMs;
    return { cycle, sweeps: lines.map((line) => bandSweep(line, cycle)) };
  }, [bands]);
  return bands.map((band, index) => (
    <Box
      key={index}
      data-sweep-band
      style={{
        insetBlockStart: band.top,
        insetInlineStart: band.left,
        inlineSize: band.width,
        blockSize: band.height,
      }}
      sx={[
        ...highlighterBand,
        {
          opacity: 0,
          clipPath: 'inset(0 100% 0 0)',
          animation: `${sweeps[index]} ${cycle}ms linear infinite`,
        },
      ]}
    />
  ));
}
