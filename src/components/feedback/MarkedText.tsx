'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { keyframes } from '@mui/material/styles';
import type { LocatedCorrection } from '@/lib/feedback/schema';
import { markStyle } from './mark-style';

const settleIn = keyframes`
  from { text-decoration-color: transparent; }
`;

export default function MarkedText({
  text,
  corrections,
  active,
  applied,
  onSelect,
}: {
  text: string;
  corrections: LocatedCorrection[];
  active: number;
  applied: Set<number>;
  onSelect: (index: number) => void;
}) {
  const parts = [];
  let cursor = 0;
  const located = corrections
    .map((correction, index) => ({ ...correction, index }))
    .filter((correction) => correction.start !== null && correction.end !== null)
    .sort((a, b) => a.start! - b.start!);
  for (const [order, correction] of located.entries()) {
    const start = correction.start!;
    const end = correction.end!;
    const style = markStyle(correction.tag);
    parts.push(text.slice(cursor, start));
    parts.push(
      <Box
        component="span"
        role="button"
        tabIndex={0}
        key={start}
        data-mark={correction.index}
        aria-label={correction.original + ': ' + correction.suggestion}
        aria-pressed={active === correction.index}
        aria-controls="correction-details"
        onClick={() => onSelect(correction.index)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(correction.index);
          }
        }}
        sx={(theme) => ({
          cursor: 'pointer',
          color: applied.has(correction.index) ? 'success.dark' : 'inherit',
          textDecorationLine: applied.has(correction.index) ? 'none' : 'underline',
          textDecorationStyle: style.decoration,
          textDecorationColor: theme.vars.palette.marks[style.group],
          textDecorationThickness: theme.spacing(0.25),
          textUnderlineOffset: theme.spacing(0.5),
          bgcolor: active === correction.index ? 'tonal.primary' : 'transparent',
          borderRadius: 0.25,
          transition: theme.transitions.create(
            ['background-color', 'color', 'text-decoration-color'],
            { duration: theme.transitions.duration.shortest },
          ),
          '@media (prefers-reduced-motion: no-preference)': {
            animation: `${settleIn} 150ms ease-out backwards`,
            animationDelay: order * 60 + 'ms',
          },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'secondary.main',
            outlineOffset: 2,
          },
          '@media (hover: hover) and (pointer: fine)': {
            '&:hover': { bgcolor: 'tonal.primary' },
          },
          '&:active': { bgcolor: 'highlighter.light' },
        })}
      >
        {applied.has(correction.index) ? correction.suggestion : text.slice(start, end)}
      </Box>,
    );
    cursor = end;
  }
  parts.push(text.slice(cursor));
  return (
    <Typography
      component="div"
      dir="ltr"
      data-marked-text
      sx={(theme) => ({
        ...theme.typography.canvas,
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        maxInlineSize: '70ch',
      })}
    >
      {parts}
    </Typography>
  );
}
