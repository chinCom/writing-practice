'use client';

import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowForward from '@mui/icons-material/ArrowForward';
import Check from '@mui/icons-material/Check';
import NavigationButton from '@/components/shared/NavigationButton';
import VisuallyHidden from '@/components/shared/VisuallyHidden';
import {
  firstSessionIndex,
  firstSessionOrder,
  type FirstSessionTaskStep,
} from '@/lib/first-session';

type StepState = 'done' | 'current' | 'upcoming';

function stepState(index: number, current: number): StepState {
  if (index < current) return 'done';
  return index === current ? 'current' : 'upcoming';
}

/** The number/check marker. Colour is paired with a check or a numeral, never used alone. */
function StepMarker({ index, state }: { index: number; state: StepState }) {
  const done = state === 'done';
  return (
    <Box
      aria-hidden="true"
      sx={{
        inlineSize: 28,
        blockSize: 28,
        borderRadius: '50%',
        border: 2,
        borderColor:
          state === 'done' ? 'success.main' : state === 'current' ? 'secondary.main' : 'divider',
        bgcolor: done ? 'success.main' : 'background.paper',
        color: done
          ? 'primary.contrastText'
          : state === 'current'
            ? 'secondary.main'
            : 'text.secondary',
        display: 'grid',
        placeItems: 'center',
        fontSize: '0.8125rem',
        fontWeight: 700,
      }}
    >
      {done ? <Check sx={{ fontSize: '1rem' }} /> : index + 1}
    </Box>
  );
}

/** The progress rule under each label: past steps are filled, the current one is violet. */
function StepRule({ state }: { state: StepState }) {
  return (
    <Box
      aria-hidden="true"
      sx={{
        inlineSize: '100%',
        blockSize: 3,
        borderRadius: 999,
        bgcolor:
          state === 'done' ? 'success.main' : state === 'current' ? 'secondary.main' : 'divider',
      }}
    />
  );
}

/**
 * The five-step rail for a learner's first loop. It appears on Today and on the
 * first feedback page, then disappears once the first revision is submitted.
 * Signing in is always complete here, so the learner starts with progress.
 */
export default function FirstSessionGuide({
  step,
  feedbackId,
  preview = false,
}: {
  step: FirstSessionTaskStep;
  feedbackId?: string;
  preview?: boolean;
}) {
  const t = useTranslations('firstSession');
  const current = firstSessionIndex(step);
  const feedbackHref = preview ? '/dev/preview/feedback-first' : '/feedback/' + feedbackId;

  return (
    <Paper
      component="section"
      variant="outlined"
      data-testid="first-session"
      sx={{ p: { xs: 2, sm: 2.5 }, minInlineSize: 0 }}
    >
      <Stack sx={{ gap: { xs: 1.5, sm: 2 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{
            gap: { xs: 0.5, sm: 2 },
            alignItems: { sm: 'baseline' },
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h3" component="h2">
            {t('title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('intro')}
          </Typography>
        </Stack>
        <List
          component="ol"
          aria-label={t('label')}
          disablePadding
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
            gap: { xs: 0.5, sm: 1 },
            alignItems: 'start',
          }}
        >
          {firstSessionOrder.map((item, index) => {
            const state = stepState(index, current);
            return (
              <ListItem
                key={item}
                disableGutters
                data-step={item}
                data-state={state}
                aria-current={state === 'current' ? 'step' : undefined}
                sx={{
                  p: 0,
                  minInlineSize: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 0.75,
                }}
              >
                <StepMarker index={index} state={state} />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: state === 'current' ? 700 : 500,
                    color: state === 'upcoming' ? 'text.secondary' : 'text.primary',
                    lineHeight: 1.25,
                  }}
                >
                  {t('steps.' + item)}
                  {state === 'done' ? <VisuallyHidden> ({t('done')})</VisuallyHidden> : null}
                </Typography>
                <StepRule state={state} />
              </ListItem>
            );
          })}
        </List>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{ gap: 1.5, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Typography variant="body2">{t('now.' + step)}</Typography>
          {step === 'feedback' && feedbackId ? (
            <NavigationButton
              tone="secondary"
              href={feedbackHref}
              endIcon={<ArrowForward />}
              sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' }, flexShrink: 0 }}
            >
              {t('readFeedback')}
            </NavigationButton>
          ) : null}
        </Stack>
      </Stack>
    </Paper>
  );
}
