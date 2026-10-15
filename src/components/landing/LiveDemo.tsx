'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import MarkedText from '@/components/feedback/MarkedText';
import WritingField from '@/components/ui/WritingField';
import type { LocatedCorrection } from '@/lib/feedback/schema';
import { analyzeWriting, repeatedWord, type HintTask, type WritingHint } from '@/lib/writing-hints';

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

type DemoMark = { correction: LocatedCorrection; message: string };

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

function MarkList({ marks, active }: { marks: DemoMark[]; active: number }) {
  const t = useTranslations('landing');
  if (!marks.length) return <Typography variant="body2">{t('demoClear')}</Typography>;
  return (
    <Stack component="ul" id="correction-details" sx={{ gap: 1, m: 0, paddingInlineStart: 2.5 }}>
      {marks.map((mark, index) => (
        <Typography
          component="li"
          variant="body2"
          key={mark.correction.start}
          sx={{ fontWeight: index === active ? 700 : 400 }}
        >
          {mark.message}
        </Typography>
      ))}
    </Stack>
  );
}

export default function LiveDemo() {
  const t = useTranslations('landing');
  const [text, setText] = useState(() => t('demoText'));
  const [active, setActive] = useState(-1);
  const marks = useDemoMarks(text);
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack sx={{ gap: 2 }}>
        <WritingField
          label={t('demoLabel')}
          value={text}
          onChange={(event) => {
            setText(event.target.value.slice(0, demoLimit));
            setActive(-1);
          }}
          multiline
          minRows={2}
          fullWidth
          slotProps={{ htmlInput: { maxLength: demoLimit } }}
        />
        <Stack sx={{ gap: 1.5 }} role="region" aria-label={t('demoResult')} aria-live="polite">
          <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t('demoResult')}
          </Typography>
          <MarkedText
            text={text}
            corrections={marks.map((mark) => mark.correction)}
            active={active}
            applied={noneApplied}
            onSelect={setActive}
          />
          <MarkList marks={marks} active={active} />
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {t('demoLocal')}
        </Typography>
      </Stack>
    </Paper>
  );
}
