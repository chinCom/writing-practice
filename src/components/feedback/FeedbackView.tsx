'use client';
import { useRef, useState } from 'react';
import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Alert from '@mui/material/Alert';
import Collapse from '@mui/material/Collapse';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import CheckCircle from '@mui/icons-material/CheckCircle';
import HelpOutline from '@mui/icons-material/HelpOutlined';
import type { LocatedFeedback } from '@/lib/feedback/schema';
import MarkedText from './MarkedText';
import { maxRevisionAttempts } from '@/lib/limits';
import { revisionText } from '@/lib/revision';
import { useUnsavedWriting } from '@/lib/use-unsaved-writing';
import ScoreBars from './ScoreBars';
import CorrectionCard from './CorrectionCard';
import ConnectorLayer from './ConnectorLayer';
import { useCorrectionChoices } from './use-correction-choices';
import type { CorrectionChoice } from '@/lib/feedback/choices';

export default function FeedbackView({
  submissionId,
  text,
  feedback,
  mock,
  hasPreviousVersion = false,
  initialChoices,
  taskId = 'weekend',
  attempt = 1,
  coursePreview = false,
}: {
  submissionId: string;
  text: string;
  feedback: LocatedFeedback;
  mock: boolean;
  hasPreviousVersion?: boolean;
  initialChoices?: CorrectionChoice[];
  taskId?: string;
  attempt?: number;
  coursePreview?: boolean;
}) {
  const t = useTranslations('feedback');
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [active, setActive] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [rewrite, setRewrite] = useState(false);
  const preview = mock && submissionId === 'preview';
  const choiceState = useCorrectionChoices(submissionId, preview, initialChoices);
  useUnsavedWriting(choiceState.pending || choiceState.errors.length > 0, t('choiceLeave'));
  const applied = new Set(
    choiceState.choices
      .filter((item) => item.status === 'applied')
      .map((item) => item.correctionIndex),
  );
  const activeChoice = choiceState.choices.find((item) => item.correctionIndex === active);
  const container = useRef<HTMLDivElement>(null);
  const total = feedback.corrections.length;
  const correction = feedback.corrections[active];
  const windowStart = Math.min(Math.max(0, active - 1), Math.max(0, total - 3));
  const nearbyIndexes = feedback.corrections
    .slice(windowStart, windowStart + 3)
    .map((_, offset) => windowStart + offset)
    .filter((index) => index !== active);
  const visibleIndexes = total ? [active, ...nearbyIndexes] : [];

  function select(index: number) {
    setActive(index);
    if (!desktop) setSheet(true);
  }
  function apply() {
    if (choiceState.loading || choiceState.loadError) return;
    const undo = applied.has(active);
    void choiceState.save({ correctionIndex: active, status: undo ? 'open' : 'applied' });
    if (!undo) {
      const next = Array.from(
        { length: total - 1 },
        (_, offset) => (active + offset + 1) % total,
      ).find(
        (index) =>
          !applied.has(index) &&
          !choiceState.choices.some(
            (item) => item.correctionIndex === index && item.status === 'dismissed',
          ),
      );
      if (next !== undefined) setActive(next);
    }
  }
  function prepareRevision() {
    try {
      sessionStorage.setItem(
        'feedback-revision:' + submissionId,
        revisionText(text, feedback.corrections, applied),
      );
    } catch {
      // A blocked browser store leaves the original revision available on the server.
    }
  }
  const saveErrors = choiceState.errors
    .filter((item) => 'status' in item.change)
    .map(({ change, code }) => (
      <Alert
        key={change.correctionIndex}
        severity="error"
        action={<Button onClick={() => void choiceState.save(change)}>{t('choiceRetry')}</Button>}
      >
        {t(code === 'UNAUTHENTICATED' ? 'choiceSession' : 'choiceError')}
      </Alert>
    ));
  const details = correction ? (
    <CorrectionCard
      correction={correction}
      submissionId={submissionId}
      preview={mock && submissionId === 'preview'}
      index={active}
      total={total}
      applied={applied.has(active)}
      onApply={apply}
      dismissed={activeChoice?.status === 'dismissed'}
      choiceBusy={choiceState.loading || choiceState.loadError}
      choiceError={
        choiceState.errors.find(
          (item) => item.change.correctionIndex === active && 'reason' in item.change,
        )?.code ?? null
      }
      onRetry={() => {
        if (choiceState.error) void choiceState.save(choiceState.error.change);
      }}
      onDismiss={() => {
        void choiceState.save({
          correctionIndex: active,
          status: activeChoice?.status === 'dismissed' ? 'open' : 'dismissed',
        });
      }}
      reportReason={activeChoice?.reason ?? null}
      onReport={(reason) => choiceState.save({ correctionIndex: active, reason })}
      onMove={(direction) => select(active + direction)}
    />
  ) : null;

  if (feedback.safety_flag)
    return (
      <Stack sx={{ gap: 3 }}>
        <Typography component="h1" variant="h1">
          {t('title')}
        </Typography>
        <Alert severity="warning">{t('safety')}</Alert>
        <Button component={NextLink} href="/today">
          {t('next')}
        </Button>
      </Stack>
    );

  return (
    <Stack sx={{ gap: 3 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(0, 0.6fr)' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <Stack sx={{ gap: 1.5, minInlineSize: 0 }}>
          <Typography component="h1" variant="h1">
            {t('title')}
          </Typography>
          <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'start' }}>
            <Chip
              size="small"
              variant="tonal"
              color="primary"
              label={t('estimated', { level: feedback.cefr_estimate })}
            />
            {feedback.strengths.map((strength) => (
              <Chip
                key={strength}
                size="small"
                variant="tonal"
                color="success"
                icon={<CheckCircle color="success" />}
                label={strength}
                slotProps={{ label: { sx: { whiteSpace: 'normal' } } }}
                sx={{ maxInlineSize: '100%', blockSize: 'auto', paddingBlock: 0.5 }}
              />
            ))}
            {feedback.priorities.slice(0, 1).map((priority) => (
              <Chip
                key={priority.tag}
                size="small"
                variant="tonal"
                color="warning"
                icon={<HelpOutline color="warning" />}
                label={t('focus', { topic: t('tags.' + priority.tag) })}
              />
            ))}
          </Stack>
        </Stack>
        <Box sx={{ paddingBlockStart: { lg: 1 }, minInlineSize: 0 }}>
          <ScoreBars scores={feedback.scores} />
        </Box>
      </Box>
      {coursePreview ? (
        <Alert
          severity="info"
          action={
            <Button component={NextLink} href="/dev/preview/path?course=full">
              {t('courseBack')}
            </Button>
          }
        >
          {t('courseSynthetic')}
        </Alert>
      ) : null}
      {mock ? (
        <Typography variant="caption" color="text.secondary">
          {t('mock')}
        </Typography>
      ) : null}
      {choiceState.loadError ? (
        <Alert
          severity="error"
          action={<Button onClick={choiceState.reload}>{t('choiceRetry')}</Button>}
        >
          {t('choiceLoadError')}
        </Alert>
      ) : null}
      {desktop || !sheet ? saveErrors : null}
      <Box
        ref={container}
        sx={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) minmax(0, 0.53fr)' },
          gap: { xs: 2, md: 3 },
          alignItems: 'start',
        }}
      >
        <Paper
          component="section"
          variant="outlined"
          sx={{
            p: { xs: 2, md: 4 },
            minInlineSize: 0,
            display: 'flex',
            flexDirection: 'column',
            minBlockSize: { md: theme.layout.feedbackCanvasMinHeight },
          }}
        >
          <Stack
            direction="row"
            sx={{
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 1,
              marginBlockEnd: 2,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {t('original')}
            </Typography>
            {total > 0 ? (
              <Button size="small" onClick={() => select(active)}>
                {t('review')}
              </Button>
            ) : null}
          </Stack>
          <MarkedText
            text={text}
            corrections={feedback.corrections}
            active={active}
            applied={applied}
            onSelect={select}
          />
          <Typography variant="caption" color="text.secondary" sx={{ marginBlockStart: 2 }}>
            {t(total ? 'selectHint' : 'noCorrections')}
          </Typography>
          <Box sx={{ marginBlockStart: 'auto', paddingBlockStart: 3 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              sx={{ gap: 1.5, borderBlockStart: 1, borderColor: 'divider', paddingBlockStart: 2 }}
            >
              <Button
                variant="contained"
                component={NextLink}
                onClick={prepareRevision}
                href={
                  coursePreview
                    ? '/dev/preview/curriculum-write?course=full&task=' + taskId
                    : attempt >= maxRevisionAttempts
                      ? preview
                        ? '/dev/preview/live-write'
                        : '/write/' + taskId
                      : preview
                        ? '/dev/preview/live-write?revise=preview'
                        : '/write/' + taskId + '?revise=' + submissionId
                }
              >
                {t(attempt >= maxRevisionAttempts ? 'newDraft' : 'revise')}
              </Button>
              {hasPreviousVersion ? (
                <Button
                  variant="outlined"
                  component={NextLink}
                  href={preview ? '/dev/preview/revision' : '/revision/' + submissionId}
                >
                  {t('compare')}
                </Button>
              ) : null}
              {feedback.level_up_rewrite ? (
                <Button
                  variant="outlined"
                  aria-expanded={rewrite}
                  onClick={() => setRewrite(!rewrite)}
                >
                  {t('rewrite')}
                </Button>
              ) : null}
            </Stack>
            <Collapse in={rewrite}>
              <Typography
                dir="ltr"
                sx={(currentTheme) => ({ ...currentTheme.typography.canvas, marginBlockStart: 3 })}
              >
                {feedback.level_up_rewrite}
              </Typography>
            </Collapse>
            <Typography variant="caption" sx={{ display: 'block', marginBlockStart: 2 }}>
              <Box component="span" sx={{ fontWeight: 600 }}>
                {t('next')}:{' '}
              </Box>
              {feedback.next_step}
            </Typography>
          </Box>
        </Paper>
        <Stack sx={{ gap: 1.5, minInlineSize: 0, display: { xs: 'none', md: 'flex' } }}>
          {total > 0 ? (
            <Typography variant="caption" color="text.secondary">
              {t('correctionCount', { total })}
            </Typography>
          ) : null}
          {(desktop ? visibleIndexes : []).map((index) => {
            const item = feedback.corrections[index];
            if (index === active)
              return (
                <Box key="active" data-card={index}>
                  {details}
                </Box>
              );
            return (
              <Paper key={index} variant="outlined" data-card={index} sx={{ overflow: 'clip' }}>
                <ButtonBase
                  onClick={() => select(index)}
                  sx={{
                    display: 'block',
                    inlineSize: '100%',
                    textAlign: 'start',
                    p: 2,
                    '&:active': { bgcolor: 'tonal.primary' },
                  }}
                >
                  <Typography variant="subtitle2" color="secondary.main">
                    {t('tags.' + item.tag)}
                  </Typography>
                  <Typography dir="ltr" variant="body2" sx={{ marginBlock: 1 }}>
                    <Box component="del">{item.original}</Box>
                    {' → '}
                    <Box component="span" sx={{ color: 'success.dark', fontWeight: 600 }}>
                      {item.suggestion}
                    </Box>
                  </Typography>
                  <Typography variant="body2">{item.explanation}</Typography>
                </ButtonBase>
              </Paper>
            );
          })}
          {feedback.priorities.length > 1 ? (
            <Stack sx={{ gap: 0.75, paddingBlockStart: 1 }}>
              <Typography variant="subtitle2">{t('priorities')}</Typography>
              {feedback.priorities.map((priority) => (
                <Typography variant="caption" key={priority.tag}>
                  {priority.why}
                </Typography>
              ))}
            </Stack>
          ) : null}
        </Stack>
        <ConnectorLayer
          container={container}
          corrections={feedback.corrections}
          active={active}
          applied={applied}
        />
      </Box>
      <SwipeableDrawer
        anchor="bottom"
        open={sheet && !desktop}
        onClose={() => setSheet(false)}
        onOpen={() => setSheet(true)}
        disableSwipeToOpen
        transitionDuration={reducedMotion ? 0 : undefined}
        slotProps={{
          paper: {
            role: 'dialog',
            'aria-label': t('details'),
            sx: {
              borderStartStartRadius: theme.layout.feedbackSheetRadius,
              borderStartEndRadius: theme.layout.feedbackSheetRadius,
              p: 2,
              paddingBlockEnd: 'calc(' + theme.spacing(2) + ' + env(safe-area-inset-bottom, 0px))',
              maxBlockSize: '80dvh',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
            },
          },
        }}
      >
        <Box
          aria-hidden="true"
          sx={{
            inlineSize: theme.spacing(5),
            blockSize: theme.spacing(0.5),
            bgcolor: 'divider',
            borderRadius: theme.shape.borderRadius,
            marginInline: 'auto',
            marginBlockEnd: 1,
          }}
        />
        {saveErrors}
        {correction && !desktop ? (
          <CorrectionCard
            correction={correction}
            submissionId={submissionId}
            preview={mock && submissionId === 'preview'}
            index={active}
            total={total}
            applied={applied.has(active)}
            onApply={apply}
            dismissed={activeChoice?.status === 'dismissed'}
            choiceBusy={choiceState.loading || choiceState.loadError}
            choiceError={
              choiceState.errors.find(
                (item) => item.change.correctionIndex === active && 'reason' in item.change,
              )?.code ?? null
            }
            onRetry={() => {
              if (choiceState.error) void choiceState.save(choiceState.error.change);
            }}
            onDismiss={() => {
              void choiceState.save({
                correctionIndex: active,
                status: activeChoice?.status === 'dismissed' ? 'open' : 'dismissed',
              });
            }}
            reportReason={activeChoice?.reason ?? null}
            onReport={(reason) => choiceState.save({ correctionIndex: active, reason })}
            onMove={(direction) => select(active + direction)}
            onClose={() => setSheet(false)}
            mobile
          />
        ) : null}
      </SwipeableDrawer>
    </Stack>
  );
}
