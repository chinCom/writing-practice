'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import MarkedText from '@/components/feedback/MarkedText';
import WritingField from '@/components/shared/WritingField';
import type { LocatedCorrection } from '@/lib/feedback/schema';
import { analyzeWriting, repeatedWord, type HintTask, type WritingHint } from '@/lib/writing-hints';
import ActionButton from '@/components/shared/ActionButton';
import { SkeletonMask } from '@/components/shared/ContentSkeleton';

const demoTask: HintTask = { id: 'landing-demo', minWords: 1, maxWords: 60, targetLevel: 'A2' };
const demoLimit = 300;
const noneApplied = new Set<number>();

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findSpan(text: string, pattern: RegExp) {
  const match = pattern.exec(text);
  return match ? { start: match.index, end: match.index + match[0].length } : null;
}

function locateHint(text: string, hint: WritingHint) {
  if (hint.kind === 'repeat') return findSpan(text, repeatedWord);
  if (hint.kind === 'verb' || hint.kind === 'past') {
    return findSpan(text, new RegExp('\\b' + escapeRegExp(hint.original) + '\\b', 'i'));
  }
  return null;
}

type SpanCorrection = Omit<LocatedCorrection, 'start' | 'end'> & { start: number; end: number };
type DemoMark = { correction: SpanCorrection; message: string };

function useDemoMarks(text: string): DemoMark[] {
  const t = useTranslations('studio');
  const marks: DemoMark[] = [];
  for (const hint of analyzeWriting(text, demoTask)) {
    const span = locateHint(text, hint);
    if (!span) continue;
    const message = t('helpHints.' + hint.kind, { ...hint });
    const original = text.slice(span.start, span.end);
    marks.push({
      message,
      correction: {
        original,
        suggestion: 'suggestion' in hint ? hint.suggestion : original.split(/\s+/)[0],
        tag: hint.kind === 'repeat' ? 'extra-word' : 'verb-form',
        severity: 'major',
        explanation: message,
        confidence: 1,
        ...span,
      },
    });
  }
  return marks;
}

export default function LiveDemo({ loading = false }: { loading?: boolean }) {
  const t = useTranslations('landing');
  const [text, setText] = useState(() => t('demoText'));
  const [draft, setDraft] = useState('');
  const [active, setActive] = useState(0);
  const [ignored, setIgnored] = useState<Set<number>>(() => new Set());
  const allMarks = useDemoMarks(text);
  const marks = allMarks.filter((mark) => !ignored.has(mark.correction.start));
  const current = marks[Math.min(active, Math.max(marks.length - 1, 0))];
  const tabs = ['grammar', 'clarity', 'tone', 'vocabulary'] as const;

  function applyAll() {
    if (!marks.length) return;
    const next = [...marks]
      .sort((left, right) => right.correction.start - left.correction.start)
      .reduce(
        (value, mark) =>
          value.slice(0, mark.correction.start) +
          mark.correction.suggestion +
          value.slice(mark.correction.end),
        text,
      );
    setText(next);
    setDraft(next);
    setActive(0);
    setIgnored(new Set());
  }

  function ignoreCurrent() {
    if (!current) return;
    setIgnored((previous) => new Set(previous).add(current.correction.start));
    setActive(0);
  }

  function step(direction: 1 | -1) {
    if (!marks.length) return;
    setActive((currentIndex) => (currentIndex + direction + marks.length) % marks.length);
  }

  return (
    <Box data-live-demo sx={{ position: 'relative', paddingBlockEnd: { sm: 3 } }}>
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          insetBlockStart: 18,
          insetInlineEnd: -26,
          inlineSize: 28,
          blockSize: 3,
          bgcolor: 'secondary.main',
          borderRadius: 999,
          transform: 'rotate(38deg)',
        }}
      />
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          insetBlockStart: 36,
          insetInlineEnd: -38,
          inlineSize: 18,
          blockSize: 3,
          bgcolor: 'secondary.main',
          borderRadius: 999,
          transform: 'rotate(12deg)',
        }}
      />
      <Paper
        sx={{
          position: 'relative',
          zIndex: 1,
          p: { xs: 1.75, sm: 2.25 },
          borderRadius: 3,
          border: 1,
          borderColor: 'divider',
          boxShadow: (theme) => theme.shadows[8],
          pb: { xs: 2.25, sm: 13 },
        }}
      >
        <Stack
          direction="row"
          sx={{
            gap: 0.75,
            flexWrap: 'wrap',
            pb: 0.5,
            borderBlockEnd: 1,
            borderColor: 'divider',
          }}
        >
          {tabs.map((tab, index) => (
            <Chip
              key={tab}
              label={t('demoTabs.' + tab)}
              size="small"
              variant={index === 0 ? 'tonal' : 'outlined'}
              color={index === 0 ? 'primary' : 'default'}
              icon={index === 0 ? <AutoAwesomeOutlined /> : undefined}
              sx={{
                height: 28,
                fontSize: '0.75rem',
                color: index === 0 ? 'secondary.main' : 'text.secondary',
                bgcolor: index === 0 ? 'tonal.primary' : 'transparent',
                borderColor: 'divider',
              }}
            />
          ))}
        </Stack>
        <Box role="region" aria-label={t('demoResult')} aria-live="polite" sx={{ pt: 1 }}>
          <SkeletonMask loading={loading}>
            <Box
              sx={{
                fontSize: { xs: '1rem', sm: '0.875rem' },
                lineHeight: 1.6,
                '& [data-marked-text]': { fontFamily: 'inherit', fontSize: 'inherit' },
              }}
            >
              <MarkedText
                text={text}
                corrections={marks.map((mark) => mark.correction)}
                active={current ? marks.indexOf(current) : -1}
                applied={noneApplied}
                onSelect={(index) => setActive(index)}
              />
            </Box>
          </SkeletonMask>
          <Box
            sx={{
              position: 'absolute',
              inlineSize: 1,
              blockSize: 1,
              overflow: 'hidden',
              clip: 'rect(0 0 0 0)',
              whiteSpace: 'nowrap',
            }}
          >
            {marks.map((mark) => (
              <Typography key={mark.correction.start} variant="body2">
                {mark.message}
              </Typography>
            ))}
          </Box>
          {!current ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {t('demoClear')}
            </Typography>
          ) : null}
        </Box>
        <Box sx={{ pt: 1 }}>
          <SkeletonMask loading={loading} variant="rounded">
            <WritingField
              label={t('demoLabel')}
              placeholder={t('demoPlaceholder')}
              value={draft}
              onChange={(event) => {
                const value = event.target.value.slice(0, demoLimit);
                setDraft(value);
                setText(value);
                setActive(0);
                setIgnored(new Set());
              }}
              multiline
              minRows={1}
              fullWidth
              size="small"
              slotProps={{
                htmlInput: { maxLength: demoLimit },
                input: {
                  sx: {
                    bgcolor: 'background.default',
                    borderRadius: 2,
                    fontSize: '0.8125rem',
                    alignItems: 'flex-start',
                    '& textarea': { lineHeight: 1.5 },
                  },
                },
              }}
            />
          </SkeletonMask>
        </Box>
      </Paper>
      <Paper
        sx={{
          position: { xs: 'relative', sm: 'absolute' },
          insetBlockEnd: { sm: 0 },
          insetInlineStart: { sm: 18, md: 30 },
          inlineSize: { xs: '100%', sm: '88%' },
          mt: { xs: 1.5, sm: 0 },
          zIndex: 2,
          p: { xs: 2, sm: 1.5 },
          borderRadius: 3,
          border: 1,
          borderColor: 'divider',
          boxShadow: (theme) => theme.shadows[10],
        }}
      >
        <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
          <AutoAwesomeOutlined sx={{ color: 'secondary.main', fontSize: 20 }} />
          <Typography variant="landingCard" component="p">
            {t('demoTabs.grammar')}
          </Typography>
        </Stack>
        <SkeletonMask loading={loading}>
          <Typography sx={{ mt: 0.75, fontSize: '0.75rem', lineHeight: 1.5, fontWeight: 500 }}>
            {current
              ? text.slice(0, current.correction.start) +
                current.correction.suggestion +
                text.slice(current.correction.end)
              : text}
          </Typography>
        </SkeletonMask>
        <Stack direction="row" sx={{ gap: 1, mt: 1, alignItems: 'center' }}>
          <ActionButton tone="primary" size="small" disabled={!marks.length} onClick={applyAll}>
            {t('acceptAll')}
          </ActionButton>
          <ActionButton
            tone="secondary"
            size="small"
            disabled={!current}
            onClick={ignoreCurrent}
            sx={{ bgcolor: 'background.paper' }}
          >
            {t('ignore')}
          </ActionButton>
          <Stack
            direction="row"
            sx={{ gap: 0.25, alignItems: 'center', marginInlineStart: 'auto' }}
          >
            <IconButton size="small" aria-label={t('prevSuggestion')} onClick={() => step(-1)}>
              <ChevronLeft fontSize="small" />
            </IconButton>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ whiteSpace: 'nowrap', minInlineSize: 34, textAlign: 'center' }}
            >
              {marks.length ? `${marks.indexOf(current) + 1} / ${marks.length}` : '0 / 0'}
            </Typography>
            <IconButton size="small" aria-label={t('nextSuggestion')} onClick={() => step(1)}>
              <ChevronRight fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
