'use client';
import { useEffect, useState, type RefObject } from 'react';
import Box from '@mui/material/Box';
import type { LocatedCorrection } from '@/lib/feedback/schema';
import { markStyle } from './mark-style';

type Connector = { index: number; path: string; x1: number; y1: number; x2: number; y2: number };

export default function ConnectorLayer({
  container,
  corrections,
  active,
  applied,
}: {
  container: RefObject<HTMLDivElement | null>;
  corrections: LocatedCorrection[];
  active: number;
  applied: Set<number>;
}) {
  const [lines, setLines] = useState<Connector[]>([]);
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    let frame = 0;
    function measure() {
      if (!root) return;
      const bounds = root.getBoundingClientRect();
      const next: Connector[] = [];
      root.querySelectorAll<HTMLElement>('[data-card]').forEach((card) => {
        const index = Number(card.dataset.card);
        const mark = root.querySelector<HTMLElement>('[data-mark="' + index + '"]');
        if (!mark) return;
        const rects = mark.getClientRects();
        const markRect = rects[rects.length - 1];
        const cardRect = card.getBoundingClientRect();
        if (!markRect) return;
        const x1 = markRect.right - bounds.left;
        // Four pixels below the glyph box is the gap between lines, so the line misses descenders.
        const y1 = markRect.bottom - bounds.top + 4;
        const x2 = cardRect.left - bounds.left;
        const y2 = cardRect.top - bounds.top + 24;
        const paperRect = root
          .querySelector('[data-marked-text]')
          ?.closest('section')
          ?.getBoundingClientRect();
        const gutter = paperRect ? (paperRect.right - bounds.left + x2) / 2 : x2;
        next.push({
          index,
          x1,
          y1,
          x2,
          y2,
          path: `M ${x1} ${y1} L ${gutter} ${y1} C ${gutter} ${y1}, ${gutter} ${y2}, ${x2} ${y2}`,
        });
      });
      setLines(next);
    }
    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    }
    const observer = new ResizeObserver(schedule);
    observer.observe(root);
    root
      .querySelectorAll('[data-marked-text], [data-card]')
      .forEach((element) => observer.observe(element));
    window.addEventListener('resize', schedule);
    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (!cancelled) schedule();
    });
    schedule();
    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
    };
  }, [container, corrections, active, applied]);
  return (
    <Box
      component="svg"
      aria-hidden="true"
      sx={{
        position: 'absolute',
        inset: 0,
        inlineSize: '100%',
        blockSize: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
        display: { xs: 'none', md: 'block' },
      }}
    >
      {lines.map((line) => (
        <Box
          component="g"
          key={line.index}
          sx={(theme) => ({
            color: theme.vars.palette.marks[markStyle(corrections[line.index].tag).group],
          })}
        >
          <Box
            component="path"
            data-connector
            d={line.path}
            fill="none"
            stroke="currentColor"
            sx={(theme) => ({
              strokeWidth: line.index === active ? 1.5 : 1,
              opacity: line.index === active ? 0.8 : 0.4,
              '@media (prefers-reduced-motion: no-preference)': {
                transition: theme.transitions.create(['stroke-width', 'opacity']),
              },
            })}
          />
          <circle cx={line.x1} cy={line.y1} r={2} fill="currentColor" />
          <circle cx={line.x2} cy={line.y2} r={3} fill="currentColor" />
        </Box>
      ))}
    </Box>
  );
}
