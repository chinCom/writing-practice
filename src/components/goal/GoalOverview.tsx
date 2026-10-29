'use client';

import { useFormatter, useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import type { GoalEstimate, GoalSummary } from '@/lib/goal';
import { scoreKeys } from '@/lib/improvement';
import type { NextTask } from '@/lib/next-task';
import NavigationButton from '@/components/shared/NavigationButton';
import ToneChip, { type ChipTone } from '@/components/shared/ToneChip';

type ActiveGoal = Extract<GoalSummary, { state: 'active' }>;

const statusTones: Record<ActiveGoal['status'], ChipTone> = {
  collecting: 'info',
  working: 'primary',
  close: 'warning',
  reached: 'success',
};

function levelLabel(level: string) {
  return level === 'PRE_A1' ? 'Pre-A1' : level;
}

function useNumber() {
  const format = useFormatter();
  return (value: number) => format.number(value, { maximumFractionDigits: 1 });
}

function useDate() {
  const format = useFormatter();
  return (date: string) =>
    format.dateTime(new Date(date + 'T00:00:00Z'), { dateStyle: 'medium', timeZone: 'UTC' });
}

function GoalSetup({ summary, preview }: { summary: GoalSummary; preview: boolean }) {
  const t = useTranslations('goal');
  const missingTarget = summary.state === 'no-target';
  return (
    <Stack sx={{ gap: 1.5, alignItems: 'flex-start' }}>
      <Typography variant="h3" component="p">
        {t(missingTarget ? 'addTargetTitle' : 'setTitle')}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t(missingTarget ? 'addTargetBody' : 'setBody')}
      </Typography>
      <NavigationButton tone="primary" href={preview ? '/dev/preview/onboarding' : '/onboarding'}>
        {t(missingTarget ? 'addTargetAction' : 'setAction')}
      </NavigationButton>
    </Stack>
  );
}

function GoalHeadline({ goal }: { goal: ActiveGoal }) {
  const t = useTranslations('goal');
  const number = useNumber();
  const date = useDate();
  const headline =
    goal.target.kind === 'ielts'
      ? t('headlineIelts', { score: number(goal.target.score) })
      : t('headlineLevel', { level: levelLabel(goal.target.level) });
  return (
    <Stack direction="row" sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
      <Typography variant="h3" component="p">
        {headline}
        {goal.targetDate ? ' ' + t('byDate', { date: date(goal.targetDate) }) : ''}
      </Typography>
      <ToneChip tone={statusTones[goal.status]} size="small" label={t('status.' + goal.status)} />
    </Stack>
  );
}

function GoalEstimateLine({ goal, estimate }: { goal: ActiveGoal; estimate: GoalEstimate }) {
  const t = useTranslations('goal');
  const number = useNumber();
  const values = {
    average: number(estimate.average),
    low: number(estimate.low),
    high: number(estimate.high),
  };
  return (
    <Stack sx={{ gap: 1 }}>
      <LinearProgress
        variant="determinate"
        value={estimate.average * 20}
        aria-label={t('estimateLabel', { average: values.average })}
        sx={{ blockSize: 8, borderRadius: 999 }}
      />
      <Typography variant="body2">
        {goal.scope.kind === 'ielts' && goal.target.kind === 'ielts'
          ? t('nowIelts', { ...values, target: number(goal.target.score) })
          : t('nowLevel', {
              ...values,
              level: levelLabel(goal.scope.kind === 'level' ? goal.scope.level : ''),
            })}
      </Typography>
    </Stack>
  );
}

function GoalCollecting({ goal }: { goal: ActiveGoal }) {
  const t = useTranslations('goal');
  return (
    <Typography variant="body2">
      {goal.scope.kind === 'ielts'
        ? t('collectingIelts', { n: goal.evidence.needed })
        : t('collectingLevel', { n: goal.evidence.needed, level: levelLabel(goal.scope.level) })}
    </Typography>
  );
}

function GoalSkills({ estimate }: { estimate: GoalEstimate }) {
  const t = useTranslations('goal');
  const skills = useTranslations('progress');
  const number = useNumber();
  return (
    <Box
      component="ul"
      sx={{
        m: 0,
        p: 0,
        listStyle: 'none',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        gap: 1,
      }}
    >
      {scoreKeys.map((key) => (
        <Box
          component="li"
          key={key}
          sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 0.25 }}
        >
          <Typography variant="caption" sx={{ fontWeight: estimate.weakest === key ? 700 : 400 }}>
            {skills(key)}
            {estimate.weakest === key ? ' · ' + t('holdingBack') : ''}
          </Typography>
          <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {number(estimate.skills[key])}/5
          </Typography>
          <LinearProgress
            variant="determinate"
            value={estimate.skills[key] * 20}
            color={estimate.weakest === key ? 'warning' : 'primary'}
            aria-label={t('skillScore', {
              skill: skills(key),
              score: number(estimate.skills[key]),
            })}
            sx={{ gridColumn: '1 / -1' }}
          />
        </Box>
      ))}
    </Box>
  );
}

function GoalDistance({ goal }: { goal: ActiveGoal }) {
  const t = useTranslations('goal');
  if (goal.target.kind === 'level' && goal.levelsToGo > 0)
    return (
      <Typography variant="body2" color="text.secondary">
        {t('levelsToGo', {
          level: levelLabel(goal.target.level),
          n: goal.levelsToGo,
          lessons: goal.lessonsRemaining,
        })}
      </Typography>
    );
  return (
    <Typography variant="body2" color="text.secondary">
      {t('lessonsToGo', { lessons: goal.lessonsRemaining })}
    </Typography>
  );
}

function GoalPace({ goal }: { goal: ActiveGoal }) {
  const t = useTranslations('goal');
  const date = useDate();
  if (!goal.pace || !goal.targetDate) return null;
  if (goal.pace.status === 'date-passed')
    return <Typography variant="body2">{t('paceDatePassed')}</Typography>;
  return (
    <Typography variant="body2">
      {goal.pace.status === 'on-pace'
        ? t('paceOnPace', { n: goal.pace.perWeekNeeded, date: date(goal.targetDate) })
        : t('paceBehind', {
            n: goal.pace.perWeekNeeded,
            date: date(goal.targetDate),
            goal: goal.week.planned,
          })}
    </Typography>
  );
}

function NextStep({ next }: { next: NextTask }) {
  const t = useTranslations('goal');
  const label =
    next.kind === 'lesson'
      ? t('next', { title: next.lessonTitle })
      : t(next.kind === 'placement' ? 'nextPlacement' : 'nextWrite');
  return (
    <Link component={NextLink} href={next.href} variant="body2" sx={{ fontWeight: 600 }}>
      {label}
    </Link>
  );
}

function GoalWeek({ goal, next }: { goal: ActiveGoal; next?: NextTask }) {
  const t = useTranslations('goal');
  const skills = useTranslations('progress');
  const weakest = goal.estimate?.weakest;
  return (
    <Stack sx={{ gap: 0.5 }}>
      <Typography variant="subtitle2" component="p">
        {t('weekTitle')}
      </Typography>
      <Typography variant="body2">
        {t('weekDone', { done: goal.week.done, planned: goal.week.planned })}
        {weakest ? ' ' + t('focus', { skill: skills(weakest) }) : ''}
      </Typography>
      <GoalPace goal={goal} />
      {next ? <NextStep next={next} /> : null}
    </Stack>
  );
}

/** The learner's goal, where they are against it, and what this week asks for. */
export default function GoalOverview({
  summary,
  next,
  preview = false,
}: {
  summary: GoalSummary;
  next?: NextTask;
  preview?: boolean;
}) {
  const t = useTranslations('goal');
  if (summary.state !== 'active') return <GoalSetup summary={summary} preview={preview} />;
  return (
    <Stack data-goal-status={summary.status} sx={{ gap: 2 }}>
      <GoalHeadline goal={summary} />
      {summary.estimate ? (
        <GoalEstimateLine goal={summary} estimate={summary.estimate} />
      ) : (
        <GoalCollecting goal={summary} />
      )}
      {summary.estimate ? <GoalSkills estimate={summary.estimate} /> : null}
      <GoalDistance goal={summary} />
      <GoalWeek goal={summary} next={next} />
      <Stack
        direction="row"
        sx={{ gap: 2, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ maxInlineSize: '60ch' }}>
          {t('caption')}
        </Typography>
        <NavigationButton
          tone="quiet"
          size="small"
          href={preview ? '/dev/preview/onboarding' : '/onboarding'}
        >
          {t('edit')}
        </NavigationButton>
      </Stack>
    </Stack>
  );
}
