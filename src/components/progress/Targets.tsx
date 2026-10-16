'use client';
import { useId } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import type { TargetProgress } from '@/lib/target-progress';

function TargetRow({ target }: { target: TargetProgress }) {
  const t = useTranslations('progress.targets');
  const tags = useTranslations('feedback.tags');
  const format = useFormatter();
  function rate(count: TargetProgress['first']) {
    return count
      ? t('rate', {
          errors: count.errors,
          uses: count.uses,
          rate: format.number(count.errors / count.uses, {
            style: 'percent',
            maximumFractionDigits: 1,
          }),
        })
      : t('unused');
  }
  return (
    <Stack component="li" sx={{ gap: 1, minWidth: 0 }}>
      <Typography component="h3" variant="subtitle1">
        {tags(target.tag)} · {target.level} — {t('states.' + target.state)}
      </Typography>
      <Typography variant="body2">{t('first', { rate: rate(target.first) })}</Typography>
      <Typography variant="body2">{t('latest', { rate: rate(target.latest) })}</Typography>
      <Typography variant="body2" color="text.secondary">
        {t('total', { tasks: target.tasks, errors: target.errors, uses: target.uses })}
      </Typography>
      <Typography variant="body2">
        {target.nextReviewAt
          ? t(target.state === 'review-due' ? 'overdue' : 'scheduled', {
              date: format.dateTime(new Date(target.nextReviewAt), {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC',
              }),
            })
          : t('unscheduled')}
      </Typography>
    </Stack>
  );
}

export default function Targets({ targets }: { targets: TargetProgress[] }) {
  const id = useId();
  const t = useTranslations('progress.targets');
  return (
    <Paper component="section" aria-labelledby={id} sx={{ p: 3 }}>
      <Stack sx={{ gap: 2 }}>
        <Typography id={id} component="h2" variant="h3">
          {t('title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('provisional')}
        </Typography>
        {targets.length ? (
          <Stack
            component="ul"
            divider={<Divider component="li" role="presentation" />}
            sx={{ listStyle: 'none', p: 0, m: 0, gap: 2 }}
          >
            {targets.map((target) => (
              <TargetRow key={`${target.level}:${target.tag}`} target={target} />
            ))}
          </Stack>
        ) : (
          <Typography>{t('empty')}</Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          {t('rule')}
        </Typography>
      </Stack>
    </Paper>
  );
}
