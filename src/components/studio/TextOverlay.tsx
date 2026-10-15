'use client';
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import Box from '@mui/material/Box';

export type Band = { top: number; left: number; width: number; height: number };
type InputRef = RefObject<HTMLTextAreaElement | null>;
type Measured = { bands: Band[]; viewHeight: number };

const bandInset = 3;

// Snap every rectangle to the textarea's line pitch. A glyph from another font, such as an
// emoji, has a taller rectangle, so raw rectangle tops would split one line into several bands.
function measureLines(
  input: HTMLTextAreaElement,
  mirror: HTMLDivElement,
  start: number,
  end: number,
): Band[] {
  const node = mirror.firstChild;
  const style = getComputedStyle(input);
  const lineHeight = parseFloat(style.lineHeight);
  if (!node?.textContent || !lineHeight) return [];
  mirror.style.width = input.clientWidth + 'px';
  mirror.style.padding = style.padding;
  const paddingTop = parseFloat(style.paddingTop);
  const origin = mirror.getBoundingClientRect();
  const length = node.textContent.length;
  const range = document.createRange();
  range.setStart(node, Math.min(start, length));
  range.setEnd(node, Math.min(end, length));
  const lines = new Map<number, Band>();
  for (const rectangle of range.getClientRects()) {
    if (!rectangle.width) continue;
    const middle = rectangle.top + rectangle.height / 2 - origin.top - paddingTop;
    const line = Math.floor(middle / lineHeight);
    const left = rectangle.left - origin.left;
    const known = lines.get(line);
    if (known) {
      const right = Math.max(known.left + known.width, left + rectangle.width);
      known.left = Math.min(known.left, left);
      known.width = right - known.left;
    } else {
      lines.set(line, {
        top: paddingTop + line * lineHeight + bandInset,
        left,
        width: rectangle.width,
        height: lineHeight - bandInset * 2,
      });
    }
  }
  return [...lines.entries()].sort(([a], [b]) => a - b).map(([, band]) => band);
}

// Draws children in the textarea's text coordinates. `start` and `end` pick a passage.
// The behind layer sits under the text, so highlights never tint the letters. Its parent must
// set `isolation: isolate`. The front layer is not clipped, so a popover can leave the box.
export default function TextOverlay({
  inputRef,
  text,
  start = 0,
  end = text.length,
  layer = 'behind',
  children,
  ...rest
}: {
  inputRef: InputRef;
  text: string;
  start?: number;
  end?: number;
  layer?: 'behind' | 'front';
  children: (measured: Measured) => ReactNode;
  'aria-hidden'?: 'true';
} & Record<`data-${string}`, string | boolean>) {
  const mirror = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<Measured>({ bands: [], viewHeight: 0 });

  useEffect(() => {
    const input = inputRef.current;
    const measure = mirror.current;
    if (!input || !measure) return;
    let frame = 0;
    let cancelled = false;
    function update() {
      if (cancelled || !input || !measure) return;
      setMeasured({
        bands: measureLines(input, measure, start, end),
        viewHeight: input.clientHeight,
      });
    }
    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }
    const observer = new ResizeObserver(schedule);
    observer.observe(input);
    void document.fonts.ready.then(schedule);
    schedule();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [inputRef, text, start, end]);

  // Bands are measured once in text coordinates. Scrolling only moves the track, so it never lags.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    function follow() {
      if (track.current && input)
        track.current.style.transform = `translateY(${-input.scrollTop}px)`;
    }
    follow();
    input.addEventListener('scroll', follow);
    return () => input.removeEventListener('scroll', follow);
  }, [inputRef, measured]);

  return (
    <Box
      {...rest}
      sx={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        ...(layer === 'behind' ? { zIndex: -1, overflow: 'clip' } : { zIndex: 1 }),
      }}
    >
      <Box
        ref={mirror}
        aria-hidden="true"
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
      <Box ref={track} sx={{ position: 'absolute', inset: 0, willChange: 'transform' }}>
        {children(measured)}
      </Box>
    </Box>
  );
}
