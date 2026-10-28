'use client';
import { useId, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import useMediaQuery from '@mui/material/useMediaQuery';
import ReportCorrection from './ReportCorrection';
import type { ReportReason } from '@/lib/feedback/choices';
import Collapse from '@mui/material/Collapse';
import Close from '@mui/icons-material/Close';
import ArrowForward from '@mui/icons-material/ArrowForward';
import WritingField from '@/components/shared/WritingField';
import type { LocatedCorrection } from '@/lib/feedback/schema';
import { markStyle } from './mark-style';
import ExplanationPanel from './ExplanationPanel';
import ActionButton from '@/components/shared/ActionButton';

export default function CorrectionCard({
  correction,
  submissionId,
  preview,
  index,
  total,
  applied,
  onApply,
  dismissed,
  choiceBusy,
  choiceError,
  onRetry,
  onDismiss,
  reportReason,
  onReport,
  onMove,
  onClose,
  mobile = false,
  answerHidden = false,
  onReveal,
  notices,
}: {
  correction: LocatedCorrection;
  submissionId: string;
  preview: boolean;
  index: number;
  total: number;
  applied: boolean;
  onApply: () => void;
  dismissed: boolean;
  choiceBusy: boolean;
  choiceError: string | null;
  onRetry: () => void;
  onDismiss: () => void;
  reportReason: ReportReason | null;
  onReport: (reason: ReportReason) => Promise<boolean>;
  onMove: (direction: number) => void;
  onClose?: () => void;
  mobile?: boolean;
  answerHidden?: boolean;
  onReveal?: () => void;
  notices?: ReactNode;
}) {
  const t = useTranslations('feedback');
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const exerciseId = useId();
  const answerInput = useRef<HTMLInputElement>(null);
  const tryButton = useRef<HTMLButtonElement>(null);
  const applyButton = useRef<HTMLButtonElement>(null);
  const [exercise, setExercise] = useState({ index, trying: false, answer: '', incorrect: false });
  const current =
    exercise.index === index ? exercise : { index, trying: false, answer: '', incorrect: false };
  const { trying, answer, incorrect } = current;
  const style = markStyle(correction.tag);
  function checkAnswer() {
    if (answer.trim().toLocaleLowerCase() === correction.suggestion.trim().toLocaleLowerCase()) {
      setExercise({ ...current, incorrect: false, trying: false });
      onApply();
      requestAnimationFrame(() => (tryButton.current ?? applyButton.current)?.focus());
    } else setExercise({ ...current, incorrect: true });
  }
  return (
    <Paper
      variant="outlined"
      id="correction-details"
      role={mobile ? undefined : 'region'}
      aria-label={mobile ? undefined : t('details')}
      sx={{
        p: 2,
        borderColor: 'secondary.main',
        overflowWrap: 'anywhere',
        ...(mobile && {
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 auto',
          minBlockSize: 0,
          overflow: 'hidden',
        }),
      }}
    >
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1, flexShrink: 0 }}
      >
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
      <Box
        sx={
          mobile
            ? {
                minBlockSize: 0,
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                paddingInline: 0.5,
              }
            : undefined
        }
      >
        {notices}
        {answerHidden ? (
          <Stack sx={{ gap: 1, marginBlock: 2 }}>
            <Typography>{correction.original}</Typography>
            <Typography variant="body2">
              {t('targetCue', { topic: t('tags.' + correction.tag) })}
            </Typography>
            <ActionButton tone="secondary" disabled={choiceBusy} onClick={onReveal}>
              {t('showMe')}
            </ActionButton>
          </Stack>
        ) : (
          <>
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
          </>
        )}
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <ActionButton tone="quiet" size="small" disabled={choiceBusy} onClick={onDismiss}>
            {t(dismissed ? 'restore' : 'dismiss')}
          </ActionButton>
          <ReportCorrection
            reason={reportReason}
            disabled={choiceBusy}
            error={choiceError}
            onReport={onReport}
          />
        </Stack>
        {dismissed ? (
          <Typography variant="caption" role="status">
            {t('dismissedNote')}
          </Typography>
        ) : null}
        {choiceError ? (
          <Alert
            severity="error"
            action={
              <ActionButton tone="quiet" onClick={onRetry} disabled={choiceBusy}>
                {t('choiceRetry')}
              </ActionButton>
            }
          >
            {t(choiceError === 'UNAUTHENTICATED' ? 'choiceSession' : 'choiceError')}
          </Alert>
        ) : null}
        <Collapse
          in={!answerHidden && trying && !applied && !dismissed}
          timeout={reducedMotion ? 0 : 180}
          onEntered={() => answerInput.current?.focus()}
          unmountOnExit
        >
          <Box
            id={exerciseId}
            component="form"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                setExercise({ ...current, trying: false });
                tryButton.current?.focus();
              }
            }}
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
              inputRef={answerInput}
              error={incorrect}
              helperText={incorrect ? t('tryAgain') : undefined}
              slotProps={{ formHelperText: { role: 'status' } }}
              value={answer}
              onChange={(event) => setExercise({ ...current, answer: event.target.value })}
            />
            <ActionButton tone="quiet" type="submit" disabled={choiceBusy}>
              {t('checkAnswer')}
            </ActionButton>
          </Box>
        </Collapse>
        {!answerHidden ? (
          <Stack direction="row" sx={{ gap: 1, marginBlockStart: 2 }}>
            {!applied && !dismissed ? (
              <ActionButton
                ref={tryButton}
                tone="secondary"
                fullWidth
                disabled={choiceBusy}
                aria-expanded={trying}
                aria-controls={trying ? exerciseId : undefined}
                onClick={() => setExercise({ ...current, trying: !trying })}
              >
                {t('try')}
              </ActionButton>
            ) : null}
            <ActionButton
              ref={applyButton}
              tone={applied ? 'secondary' : 'primary'}
              fullWidth
              disabled={choiceBusy || dismissed}
              onClick={onApply}
            >
              {t(applied ? 'undo' : 'apply')}
            </ActionButton>
          </Stack>
        ) : null}
        {applied ? (
          <Typography
            role="status"
            variant="caption"
            sx={{ display: 'block', marginBlockStart: 1 }}
          >
            {t('localFix')}
          </Typography>
        ) : null}
      </Box>
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          marginBlockStart: 2,
          flexShrink: 0,
          ...(mobile && { borderBlockStart: 1, borderColor: 'divider', paddingBlockStart: 1 }),
        }}
      >
        <ActionButton
          tone="quiet"
          size="small"
          aria-label={t('previous')}
          disabled={index === 0}
          onClick={() => onMove(-1)}
        >
          {t('previousShort')}
        </ActionButton>
        <Typography variant="caption" role="status">
          {t('position', { n: index + 1, total })}
        </Typography>
        <ActionButton
          tone="quiet"
          size="small"
          aria-label={t('following')}
          disabled={index === total - 1}
          onClick={() => onMove(1)}
        >
          {t('nextShort')}
        </ActionButton>
      </Stack>
    </Paper>
  );
}
