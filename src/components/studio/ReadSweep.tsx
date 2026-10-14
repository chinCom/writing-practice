'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { keyframes, useTheme } from '@mui/material/styles';

type Band = { top: number; left: number; width: number; height: number };
const sweep = keyframes`
  0%, 8% { transform: scaleX(0); opacity: 0; }
  15% { opacity: 0.4; }
  55%, 75% { transform: scaleX(1); opacity: 0.4; }
  100% { transform: scaleX(1); opacity: 0; }
`;

export default function ReadSweep(props: {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  text: string;
}) {
  const animate = useMediaQuery('(prefers-reduced-motion: no-preference)');
  return animate ? <MeasuredSweep {...props} /> : null;
}

function MeasuredSweep({
  inputRef,
  text,
}: {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  text: string;
}) {
  const theme = useTheme();
  const mirror = useRef<HTMLDivElement>(null);
  const [bands, setBands] = useState<Band[]>([]);
  useEffect(() => {
    const input = inputRef.current;
    const measure = mirror.current;
    if (!input || !measure) return;
    let frame = 0;
    let cancelled = false;
    function update() {
      if (cancelled || !input || !measure) return;
      const style = getComputedStyle(input);
      measure.style.width = input.clientWidth + 'px';
      measure.style.padding = style.padding;
      const node = measure.firstChild;
      if (!node) return;
      const range = document.createRange();
      const origin = measure.getBoundingClientRect();
      const lines: Band[] = [];
      for (let offset = 0; offset < text.length; offset++) {
        if (text[offset] === '\n') continue;
        range.setStart(node, offset);
        range.setEnd(node, offset + 1);
        const rectangle = range.getBoundingClientRect();
        if (!rectangle.width) continue;
        const top = rectangle.top - origin.top - input.scrollTop;
        if (top + rectangle.height <= 0 || top >= input.clientHeight) continue;
        const left = rectangle.left - origin.left - input.scrollLeft;
        const previous = lines.at(-1);
        if (previous && Math.abs(previous.top - top) < 1) {
          previous.width = Math.max(previous.width, left + rectangle.width - previous.left);
        } else {
          lines.push({ top, left, width: rectangle.width, height: rectangle.height });
        }
      }
      setBands(lines);
    }
    function schedule() {
      if (cancelled) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }
    const observer = new ResizeObserver(schedule);
    observer.observe(input);
    input.addEventListener('scroll', schedule);
    void document.fonts.ready.then(schedule);
    schedule();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      input.removeEventListener('scroll', schedule);
    };
  }, [inputRef, text]);
  return (
    <Box
      data-read-sweep
      aria-hidden="true"
      sx={{ position: 'absolute', inset: 0, overflow: 'clip', pointerEvents: 'none' }}
    >
      <Box
        ref={mirror}
        sx={(theme) => ({
          ...theme.typography.canvas,
          position: 'absolute',
          insetBlockStart: 0,
          insetInlineStart: 0,
          visibility: 'hidden',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
          boxSizing: 'border-box',
        })}
      >
        {text}
      </Box>
      {bands.map((band, index) => (
        <Box
          key={index}
          data-sweep-band
          style={{
            insetBlockStart: band.top,
            insetInlineStart: band.left,
            inlineSize: band.width,
            blockSize: band.height,
            animationDelay: index * theme.layout.readSweepStagger + 'ms',
          }}
          sx={(theme) => ({
            position: 'absolute',
            bgcolor: 'highlighter.main',
            borderRadius: 0.5,
            transformOrigin: 'left',
            opacity: 0,
            '@media (prefers-reduced-motion: no-preference)': {
              animation: `${sweep} ${theme.layout.readSweepDuration}ms ${theme.transitions.easing.easeInOut} infinite`,
            },
          })}
        />
      ))}
    </Box>
  );
}
