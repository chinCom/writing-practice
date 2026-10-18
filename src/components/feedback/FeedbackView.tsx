'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
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
import ScoreBars from './ScoreBars';
import TargetReport from './TargetReport';
import CorrectionCard from './CorrectionCard';
import ConnectorLayer from './ConnectorLayer';
import { useFeedbackReview } from './useFeedbackReview';
import type { CorrectionChoice } from '@/lib/feedback/choices';
import NavigationButton from '@/components/shared/NavigationButton';
import ActionButton from '@/components/shared/ActionButton';
import ToneChip from '@/components/shared/ToneChip';

export default function FeedbackView({
  submissionId,
  text,
  feedback,
  mock,
  hasPreviousVersion = false,
  hasSubmittedRevision = false,
  avoided = [],
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
  hasSubmittedRevision?: boolean;
  avoided?: string[];
  initialChoices?: CorrectionChoice[];
  taskId?: string;
  attempt?: number;
  coursePreview?: boolean;
}) {
  const t = useTranslations('feedback');
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [rewrite, setRewrite] = useState(false);
  const preview = mock && submissionId === 'preview';
  const review = useFeedbackReview({
    submissionId,
    text,
    feedback,
    preview,
    initialChoices,
    answersUnlocked: hasPreviousVersion || attempt > 1 || hasSubmittedRevision,
    desktop,
    leaveWarning: t('choiceLeave'),
  });
  const {
    active,
    sheet,
    setSheet,
    total,
    correction,
    activeChoice,
    choiceState,
    applied,
    hiddenAnswers,
    rewriteAvailable,
    visibleIndexes,
    select,
    prepareRevision,
  } = review;
  const container = useRef<HTMLDivElement>(null);
  const cardFade = useRef<HTMLDivElement>(null);
  // Fade the card on the same element. Remounting it would drop keyboard focus from its buttons.
  useEffect(() => {
    if (!reducedMotion)
      cardFade.current?.animate({ opacity: [0, 1] }, { duration: 150, easing: 'ease-out' });
  }, [active, reducedMotion]);
  const saveErrors = choiceState.errors
    .filter((item) => !('reason' in item.change))
    .map(({ change, code }) => (
      <Alert
        key={change.correctionIndex}
        severity="error"
        action={
          <ActionButton tone="quiet" onClick={() => void choiceState.save(change)}>
            {t('choiceRetry')}
          </ActionButton>
        }
      >
        {t(code === 'UNAUTHENTICATED' ? 'choiceSession' : 'choiceError')}
      </Alert>
    ));
  const correctionProps = {
    submissionId,
    preview,
    answerHidden: hiddenAnswers.has(active),
    onReveal: review.reveal,
    index: active,
    total,
    applied: applied.has(active),
    onApply: review.apply,
    dismissed: activeChoice?.status === 'dismissed',
    choiceBusy: choiceState.loading || choiceState.loadError,
    choiceError:
      choiceState.errors.find(
        (item) => item.change.correctionIndex === active && 'reason' in item.change,
      )?.code ?? null,
    onRetry: review.retryReport,
    onDismiss: review.dismiss,
    reportReason: activeChoice?.reason ?? null,
    onReport: review.report,
    onMove: (direction: number) => select(active + direction),
  };
  const details = correction ? (
    <CorrectionCard correction={correction} {...correctionProps} />
  ) : null;

  if (feedback.safety_flag)
    return (
      <Stack sx={{ gap: 3 }}>
        <Typography component="h1" variant="h1">
          {t('title')}
        </Typography>
        <Alert severity="warning">{t('safety')}</Alert>
        <NavigationButton href="/today">{t('next')}</NavigationButton>
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
          {feedback.target_report ? <TargetReport report={feedback.target_report} /> : null}
          {avoided.map((tag) => (
            <Alert key={tag} severity="info">
              {t('targetAvoided', { topic: t('tags.' + tag) })}
            </Alert>
          ))}
          <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'start' }}>
            <ToneChip
              size="small"
              tone="primary"
              label={t('estimated', { level: feedback.cefr_estimate })}
            />
            {feedback.strengths.map((strength) => (
              <ToneChip
                key={strength}
                size="small"
                tone="success"
                icon={<CheckCircle color="success" />}
                label={strength}
                slotProps={{ label: { sx: { whiteSpace: 'normal' } } }}
                sx={{ maxInlineSize: '100%', blockSize: 'auto', paddingBlock: 0.5 }}
              />
            ))}
            {feedback.priorities.slice(0, 1).map((priority) => (
              <ToneChip
                key={priority.tag}
                size="small"
                tone="warning"
                icon={<HelpOutline color="warning" />}
                label={t('focus', { topic: t('tags.' + priority.tag) })}
              />
            ))}
          </Stack>
        </Stack>
        <Box sx={{ paddingBlockStart: { lg: 1 }, minInlineSize: 0 }}>
          <ScoreBars scores={feedback.scores} taskId={taskId} />
        </Box>
      </Box>
      {coursePreview ? (
        <Alert
          severity="info"
          action={
            <NavigationButton href="/dev/preview/path?course=full">
              {t('courseBack')}
            </NavigationButton>
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
          action={
            <ActionButton tone="quiet" onClick={choiceState.reload}>
              {t('choiceRetry')}
            </ActionButton>
          }
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
              <ActionButton tone="quiet" size="small" onClick={() => select(active)}>
                {t('review')}
              </ActionButton>
            ) : null}
          </Stack>
          <MarkedText
            text={text}
            corrections={feedback.corrections}
            active={active}
            applied={applied}
            hiddenAnswers={hiddenAnswers}
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
              <NavigationButton
                tone="primary"
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
              </NavigationButton>
              {hasPreviousVersion ? (
                <NavigationButton
                  tone="secondary"
                  href={preview ? '/dev/preview/revision' : '/revision/' + submissionId}
                >
                  {t('compare')}
                </NavigationButton>
              ) : null}
              {feedback.level_up_rewrite && rewriteAvailable ? (
                <ActionButton
                  tone="secondary"
                  aria-expanded={rewrite}
                  onClick={() => setRewrite(!rewrite)}
                >
                  {t('rewrite')}
                </ActionButton>
              ) : null}
            </Stack>
            <Collapse in={rewrite && rewriteAvailable} unmountOnExit>
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
              {hiddenAnswers.size ? t('selfRevisionNext') : feedback.next_step}
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
                  <Box ref={cardFade}>{details}</Box>
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
                  {hiddenAnswers.has(index) ? (
                    <Typography variant="body2" sx={{ marginBlock: 1 }}>
                      {item.original} · {t('targetCue', { topic: t('tags.' + item.tag) })}
                    </Typography>
                  ) : (
                    <>
                      <Typography dir="ltr" variant="body2" sx={{ marginBlock: 1 }}>
                        <Box component="del">{item.original}</Box>
                        {' → '}
                        <Box component="span" sx={{ color: 'success.dark', fontWeight: 600 }}>
                          {item.suggestion}
                        </Box>
                      </Typography>
                      <Typography variant="body2">{item.explanation}</Typography>
                    </>
                  )}
                </ButtonBase>
              </Paper>
            );
          })}
          {feedback.priorities.length > 1 && hiddenAnswers.size === 0 ? (
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
            {...correctionProps}
            onClose={() => setSheet(false)}
            mobile
          />
        ) : null}
      </SwipeableDrawer>
    </Stack>
  );
}
