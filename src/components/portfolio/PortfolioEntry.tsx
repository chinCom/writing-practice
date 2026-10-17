'use client';

import { useState } from 'react';
import NextLink from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { keyframes } from '@mui/material/styles';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import ArrowForward from '@mui/icons-material/ArrowForward';
import CompareArrowsOutlined from '@mui/icons-material/CompareArrowsOutlined';
import type { WritingVersion } from '@/lib/revision';
import PaperAccent from '@/components/ui/icons/PaperAccent';

const entryIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
`;
const clampAboveWords = 60;
const clampedLines = 4;
const staggerLimit = 5;

function writingKind(text: string, words: number) {
  const start = text.trim().toLowerCase();
  if (start.startsWith('hi ') || start.startsWith('dear ') || start.startsWith('hello '))
    return 'message';
  return words >= 60 ? 'essay' : 'note';
}

export default function PortfolioEntry({
  entry,
  order,
  preview,
  featured = false,
}: {
  entry: WritingVersion;
  order: number;
  preview: boolean;
  featured?: boolean;
}) {
  const t = useTranslations('portfolio');
  const format = useFormatter();
  const long = entry.wordCount > clampAboveWords;
  const [expanded, setExpanded] = useState(false);
  const clamped = long && !expanded;
  const kind = writingKind(entry.text, entry.wordCount);

  const body = (
    <Stack sx={{ gap: 1.25, minInlineSize: 0 }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Chip
          label={t(kind)}
          size="small"
          variant="tonal"
          color={featured ? 'primary' : 'success'}
        />
        {featured ? (
          <Chip label={t('featured')} size="small" variant="outlined" color="primary" />
        ) : (
          <Chip
            label={t(entry.parentSubmissionId ? 'revision' : 'firstDraft')}
            size="small"
            variant="outlined"
          />
        )}
      </Stack>
      {featured ? (
        <>
          <Typography variant="caption" color="text.secondary">
            {t('latestVersion')} · {t('version', { n: entry.attempt })}
          </Typography>
          <Typography component="h2" variant="h2" sx={{ fontSize: '1.75rem', lineHeight: 1.15 }}>
            {t('latestDraft')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {format.dateTime(new Date(entry.createdAt), {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
            {' · '}
            {t('words', { n: entry.wordCount })}
            {' · '}
            {t('version', { n: entry.attempt })}
          </Typography>
        </>
      ) : (
        <Typography component="h2" variant="h3" sx={{ fontSize: '1.125rem' }}>
          {t('version', { n: entry.attempt })}
        </Typography>
      )}
      <Typography
        dir="ltr"
        sx={{
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          maxInlineSize: '74ch',
          lineHeight: 1.6,
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
          sx={{ alignSelf: 'flex-start', paddingInline: 0, minHeight: 32 }}
        >
          {t(expanded ? 'showLess' : 'showMore')}
        </Button>
      ) : null}
    </Stack>
  );

  const actions = (
    <Stack
      direction={featured ? 'column' : { xs: 'row', sm: 'row' }}
      sx={{ gap: 1, alignItems: featured ? 'stretch' : 'center', flexWrap: 'wrap' }}
    >
      <Button
        component={NextLink}
        href={'/feedback/' + entry.id}
        variant={featured ? 'contained' : 'text'}
        endIcon={<ArrowForward sx={{ fontSize: '0.875rem !important' }} />}
        fullWidth={featured}
        sx={{ whiteSpace: featured ? 'normal' : 'nowrap', lineHeight: 1.25 }}
      >
        {t('open')}
      </Button>
      {entry.parentSubmissionId ? (
        <Button
          variant="outlined"
          component={NextLink}
          href={preview ? '/dev/preview/revision' : '/revision/' + entry.id}
          startIcon={<CompareArrowsOutlined sx={{ fontSize: '1rem !important' }} />}
          fullWidth={featured}
          sx={{ whiteSpace: featured ? 'normal' : 'nowrap', lineHeight: 1.25 }}
        >
          {t('compare')}
        </Button>
      ) : null}
    </Stack>
  );

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2.5, md: 3 },
        backgroundImage: featured
          ? (theme) =>
              `linear-gradient(125deg, ${theme.vars.palette.tonal.primary} 0%, transparent 38%)`
          : 'none',
        '@media (prefers-reduced-motion: no-preference)': {
          animation: `${entryIn} 220ms ease-out backwards`,
          animationDelay: Math.min(order, staggerLimit) * 60 + 'ms',
        },
      }}
    >
      {featured ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              sm: '150px minmax(0, 1fr)',
              lg: '180px minmax(0, 1fr) 280px',
            },
            gap: { xs: 2, md: 3 },
            alignItems: 'start',
          }}
        >
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, justifyContent: 'center' }}>
            <PaperAccent
              inlineSize={168}
              blockSize={150}
              kind="travel"

              sx={{ display: 'block' }}
            />
          </Box>
          {body}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              bgcolor: 'background.paper',
              boxShadow: 'none',
              gridColumn: { xs: '1 / -1', lg: 'auto' },
              '@media (prefers-reduced-motion: no-preference)': {
                animation: `${entryIn} 220ms ease-out backwards`,
              },
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {t('latestVersion')}
            </Typography>
            <Typography variant="subtitle1" component="p" sx={{ mb: 0.25 }}>
              {t('version', { n: entry.attempt })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {format.dateTime(new Date(entry.createdAt), {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
              {' · '}
              {t('words', { n: entry.wordCount })}
            </Typography>
            <Box sx={{ mt: 1.75 }}>{actions}</Box>
          </Paper>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: '48px minmax(0, 1fr) auto' },
            gap: { xs: 1.5, sm: 2.5 },
            alignItems: 'start',
          }}
        >
          <Box
            sx={{
              display: { xs: 'none', sm: 'grid' },
              inlineSize: 48,
              blockSize: 48,
              borderRadius: 2,
              bgcolor: 'background.default',
              border: 1,
              borderColor: 'divider',
              color: 'secondary.main',
              placeItems: 'center',
            }}
          >
            <DescriptionOutlined />
          </Box>
          {body}
          {actions}
        </Box>
      )}
    </Paper>
  );
}
