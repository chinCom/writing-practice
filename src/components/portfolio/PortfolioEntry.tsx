'use client';
import { useState } from 'react';
import NextLink from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { keyframes } from '@mui/material/styles';
import type { WritingVersion } from '@/lib/revision';

const entryIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
`;
const clampAboveWords = 60;
const clampedLines = 4;
const staggerLimit = 5;

export default function PortfolioEntry({
  entry,
  order,
  preview,
}: {
  entry: WritingVersion;
  order: number;
  preview: boolean;
}) {
  const t = useTranslations('portfolio');
  const format = useFormatter();
  const long = entry.wordCount > clampAboveWords;
  const [expanded, setExpanded] = useState(false);
  const clamped = long && !expanded;
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        '@media (prefers-reduced-motion: no-preference)': {
          animation: `${entryIn} 220ms ease-out backwards`,
          animationDelay: Math.min(order, staggerLimit) * 60 + 'ms',
        },
      }}
    >
      <Stack sx={{ gap: 1.5 }}>
        <Typography variant="h3">{t('version', { n: entry.attempt })}</Typography>
        <Typography variant="body2" color="text.secondary">
          {format.dateTime(new Date(entry.createdAt), {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}{' '}
          · {t('words', { n: entry.wordCount })}
        </Typography>
        <Typography
          dir="ltr"
          sx={{
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            ...(clamped && {
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: clampedLines,
              overflow: 'hidden',
            }),
          }}
        >
          {entry.text}
        </Typography>
        {long ? (
          <Button
            size="small"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
            sx={{ alignSelf: 'flex-start', paddingInline: 0 }}
          >
            {t(expanded ? 'showLess' : 'showMore')}
          </Button>
        ) : null}
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1 }}>
          <Button component={NextLink} href={'/feedback/' + entry.id} sx={{ paddingInline: 0 }}>
            {t('open')}
          </Button>
          {entry.parentSubmissionId ? (
            <Button
              variant="outlined"
              component={NextLink}
              href={preview ? '/dev/preview/revision' : '/revision/' + entry.id}
            >
              {t('compare')}
            </Button>
          ) : null}
        </Stack>
      </Stack>
    </Paper>
  );
}
