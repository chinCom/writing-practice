'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Collapse from '@mui/material/Collapse';
import Close from '@mui/icons-material/Close';
import ArrowForward from '@mui/icons-material/ArrowForward';
import WritingField from '@/components/ui/WritingField';
import type { LocatedCorrection } from '@/lib/feedback/schema';
import { markStyle } from './mark-style';
import ExplanationPanel from './ExplanationPanel';

export default function CorrectionCard({
  correction,
  submissionId,
  preview,
  index,
  total,
  applied,
  onApply,
  onMove,
  onClose,
  mobile = false,
}: {
  correction: LocatedCorrection;
  submissionId: string;
  preview: boolean;
  index: number;
  total: number;
  applied: boolean;
  onApply: () => void;
  onMove: (direction: number) => void;
  onClose?: () => void;
  mobile?: boolean;
}) {
  const t = useTranslations('feedback');
  const [exercise, setExercise] = useState({ index, trying: false, answer: '', incorrect: false });
  const current =
    exercise.index === index ? exercise : { index, trying: false, answer: '', incorrect: false };
  const { trying, answer, incorrect } = current;
  const style = markStyle(correction.tag);
  function checkAnswer() {
    if (answer.trim().toLocaleLowerCase() === correction.suggestion.trim().toLocaleLowerCase()) {
      setExercise({ ...current, incorrect: false, trying: false });
      onApply();
    } else setExercise({ ...current, incorrect: true });
  }
  return (
    <Paper
      variant="outlined"
      id="correction-details"
      role={mobile ? undefined : 'region'}
      aria-label={mobile ? undefined : t('details')}
      sx={{ p: 2, borderColor: 'secondary.main', overflowWrap: 'anywhere' }}
    >
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
          <Box
            component="span"
            aria-hidden="true"
            sx={(theme) => ({
              color: theme.vars.palette.marks[style.group],
              textDecoration: 'underline',
              textDecorationStyle: style.decoration,
            })}
          >
            ∿
          </Box>
          <Typography variant="subtitle2" color="secondary.main">
            {t('tags.' + correction.tag)}
          </Typography>
        </Stack>
        {onClose ? (
          <IconButton aria-label={t('closeCorrection')} onClick={onClose}>
            <Close fontSize="small" />
          </IconButton>
        ) : null}
      </Stack>
      <Stack
        direction="row"
        dir="ltr"
        sx={{ alignItems: 'baseline', flexWrap: 'wrap', gap: 1, marginBlock: 1.5 }}
      >
        <Typography component="del">{correction.original}</Typography>
        <ArrowForward fontSize="small" aria-hidden="true" />
        <Typography sx={{ color: 'success.dark', fontWeight: 600 }}>
          {correction.suggestion}
        </Typography>
      </Stack>
      {correction.start === null ? (
        <Typography variant="caption" color="text.secondary">
          {t('unmarked')}
        </Typography>
      ) : null}
      <Typography variant="body2">{correction.explanation}</Typography>
      <ExplanationPanel submissionId={submissionId} index={index} preview={preview} />
      <Collapse in={trying && !applied}>
        <Box
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            checkAnswer();
          }}
          sx={{ marginBlockStart: 2 }}
        >
          <WritingField
            size="small"
            fullWidth
            label={t('answer')}
            value={answer}
            onChange={(event) => setExercise({ ...current, answer: event.target.value })}
          />
          {incorrect ? (
            <Typography role="status" variant="body2" sx={{ marginBlockStart: 1 }}>
              {t('tryAgain')}
            </Typography>
          ) : null}
          <Button type="submit">{t('checkAnswer')}</Button>
        </Box>
      </Collapse>
      <Stack direction="row" sx={{ gap: 1, marginBlockStart: 2 }}>
        {!applied ? (
          <Button
            variant="outlined"
            fullWidth
            onClick={() => setExercise({ ...current, trying: !trying })}
          >
            {t('try')}
          </Button>
        ) : null}
        <Button variant={applied ? 'outlined' : 'contained'} fullWidth onClick={onApply}>
          {t(applied ? 'undo' : 'apply')}
        </Button>
      </Stack>
      {applied ? (
        <Typography role="status" variant="caption" sx={{ display: 'block', marginBlockStart: 1 }}>
          {t('localFix')}
        </Typography>
      ) : null}
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, marginBlockStart: 2 }}
      >
        <Button
          size="small"
          aria-label={t('previous')}
          disabled={index === 0}
          onClick={() => onMove(-1)}
        >
          {t('previousShort')}
        </Button>
        <Typography variant="caption" role="status">
          {t('position', { n: index + 1, total })}
        </Typography>
        <Button
          size="small"
          aria-label={t('following')}
          disabled={index === total - 1}
          onClick={() => onMove(1)}
        >
          {t('nextShort')}
        </Button>
      </Stack>
    </Paper>
  );
}
