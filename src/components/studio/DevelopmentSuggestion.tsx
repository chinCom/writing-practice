'use client';
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Close from '@mui/icons-material/Close';
import { keyframes } from '@mui/material/styles';
import TextOverlay, { type Band } from './TextOverlay';
import { highlighterBand } from './ReadSweep';
import { developmentFocus, type Development } from '@/lib/feedback/development';
import { readingSchedule } from '@/lib/reading-schedule';

type InputRef = RefObject<HTMLTextAreaElement | null>;
type Placement = 'below' | 'above';

const draw = keyframes`
  from { clip-path: inset(0 100% 0 0); }
  to { clip-path: inset(0 0 0 0); }
`;
const glow = keyframes`
  from { box-shadow: 0 0 0 0 var(--glow); }
  to { box-shadow: 0 0 0 10px transparent; }
`;
const pop = keyframes`
  from { opacity: 0.65; transform: translateY(var(--rise)); }
  to { opacity: 1; transform: none; }
`;
const rise = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
`;
const motion = '@media (prefers-reduced-motion: no-preference)';
const calloutGap = 12;

// The coach's question appears at the passage it is about, so the learner answers it in place.
export default function DevelopmentSuggestion({
  inputRef,
  text,
  guidance,
  onClose,
}: {
  inputRef: InputRef;
  text: string;
  guidance: Development;
  onClose: () => void;
}) {
  const focus = developmentFocus(text, guidance.focus_text);
  // Without a unique passage, the bubble points to the end of the draft instead.
  const anchorEnd = text.trimEnd().length;
  const start = focus?.start ?? Math.max(0, anchorEnd - 1);
  const end = focus?.end ?? anchorEnd;
  return (
    <>
      {focus ? (
        <TextOverlay inputRef={inputRef} text={text} start={start} end={end} aria-hidden="true">
          {({ bands }) => <PassageMarks bands={bands} />}
        </TextOverlay>
      ) : null}
      <TextOverlay inputRef={inputRef} text={text} start={start} end={end} layer="front">
        {({ bands, viewHeight }) =>
          bands.length ? (
            <Callout
              inputRef={inputRef}
              bands={bands}
              viewHeight={viewHeight}
              delay={focus ? readingSchedule(bands.map((band) => band.width)).total : 0}
              guidance={guidance}
              onClose={onClose}
            />
          ) : null
        }
      </TextOverlay>
    </>
  );
}

function PassageMarks({ bands }: { bands: Band[] }) {
  const { total, lines } = readingSchedule(bands.map((band) => band.width));
  return bands.map((band, index) => (
    <Box
      key={index}
      data-focus-band
      style={{
        insetBlockStart: band.top,
        insetInlineStart: band.left,
        inlineSize: band.width,
        blockSize: band.height,
      }}
      sx={[
        ...highlighterBand,
        (theme) => ({
          opacity: 0.75,
          '--glow': theme.vars.palette.highlighter.main,
          [motion]: {
            animation: [
              `${draw} ${lines[index].duration}ms linear ${lines[index].start}ms both`,
              `${glow} 900ms ease-out ${total}ms`,
            ].join(', '),
          },
        }),
      ]}
    />
  ));
}

function Callout({
  inputRef,
  bands,
  viewHeight,
  delay,
  guidance,
  onClose,
}: {
  inputRef: InputRef;
  bands: Band[];
  viewHeight: number;
  delay: number;
  guidance: Development;
  onClose: () => void;
}) {
  const t = useTranslations('development');
  const [placement, setPlacement] = useState<Placement>('below');
  const [inView, setInView] = useState(true);
  const first = bands[0];
  const last = bands[bands.length - 1];
  const shown = useRef(false);
  const calloutRef = useRef<HTMLDivElement>(null);

  // Bring the passage into view once. The bubble may leave the box, so prefer below and only
  // flip when the space above is clearly enough and the space below is not.
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input || shown.current) return;
    shown.current = true;
    input.scrollTop = Math.max(0, first.top - viewHeight * 0.3);
  }, [inputRef, first, viewHeight]);

  // Measure the real bubble before choosing a side. This keeps it out of the editor footer
  // instead of relying on a fixed guess for how tall the question is.
  useLayoutEffect(() => {
    const input = inputRef.current;
    const callout = calloutRef.current;
    if (!input || !callout) return;
    const below = viewHeight - (last.top + last.height - input.scrollTop);
    const above = first.top - input.scrollTop;
    const height = callout.offsetHeight;
    const next: Placement =
      below < height + calloutGap && above >= height + calloutGap ? 'above' : 'below';
    if (next !== placement) setPlacement(next);
  }, [inputRef, first, last, viewHeight, placement]);

  // The bubble is not clipped, so hide it while its passage is scrolled out of the box.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    function track() {
      if (!input) return;
      const top = first.top - input.scrollTop;
      const bottom = last.top + last.height - input.scrollTop;
      setInView(bottom > 0 && top < input.clientHeight);
    }
    track();
    input.addEventListener('scroll', track, { passive: true });
    return () => input.removeEventListener('scroll', track);
  }, [inputRef, first, last]);

  // Center, not nearest: a fixed bottom navigation bar covers the lowest part of the viewport.
  useEffect(() => {
    inputRef.current?.scrollIntoView({ block: 'center' });
  }, [inputRef]);

  const anchor = placement === 'below' ? last : first;
  const pointerX = anchor.left + anchor.width / 2;
  const position =
    placement === 'below'
      ? { insetBlockStart: last.top + last.height + calloutGap }
      : { insetBlockEnd: `calc(100% - ${first.top - calloutGap}px)` };
  return (
    <Box
      ref={calloutRef}
      component="section"
      aria-label={t('suggestion')}
      aria-live="polite"
      data-development-callout={placement}
      hidden={!inView}
      style={position}
      sx={(theme) => ({
        position: 'absolute',
        insetInlineStart: 0,
        inlineSize: 'min(100%, 26rem)',
        pointerEvents: 'auto',
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'highlighter.main',
        boxShadow: theme.shadows[6],
        '--rise': placement === 'below' ? '-8px' : '8px',
        transformOrigin: `${pointerX}px ${placement === 'below' ? 'top' : 'bottom'}`,
        [motion]: {
          animation: `${pop} 200ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms backwards`,
          '& [data-rise]': {
            animation: `${rise} 320ms ease-out both`,
          },
          '& [data-rise]:nth-of-type(1)': { animationDelay: `${delay + 160}ms` },
          '& [data-rise]:nth-of-type(2)': { animationDelay: `${delay + 260}ms` },
        },
      })}
    >
      <Pointer x={pointerX} placement={placement} />
      <IconButton
        size="small"
        aria-label={t('close')}
        onClick={onClose}
        sx={{ position: 'absolute', insetBlockStart: 4, insetInlineEnd: 4 }}
      >
        <Close fontSize="small" />
      </IconButton>
      <Stack
        sx={{
          gap: 1,
          p: 2,
          pr: 5,
        }}
      >
        <Typography variant="body1" sx={{ fontWeight: 'bold' }} data-rise>
          {guidance.question}
        </Typography>
        {guidance.sentence_starter ? (
          <Typography
            variant="body2"
            data-rise
            sx={{ bgcolor: 'highlighter.light', borderRadius: 1, px: 1, py: 0.5 }}
          >
            {guidance.sentence_starter}
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );
}

function Pointer({ x, placement }: { x: number; placement: Placement }) {
  const below = placement === 'below';
  return (
    <Box
      aria-hidden="true"
      style={{ insetInlineStart: `clamp(12px, ${x - 7}px, calc(100% - 26px))` }}
      sx={{
        position: 'absolute',
        [below ? 'insetBlockStart' : 'insetBlockEnd']: -7,
        inlineSize: 14,
        blockSize: 14,
        bgcolor: 'background.paper',
        borderInlineStart: '1px solid',
        borderBlockStart: '1px solid',
        borderColor: 'highlighter.main',
        transform: below ? 'rotate(45deg)' : 'rotate(225deg)',
      }}
    />
  );
}
