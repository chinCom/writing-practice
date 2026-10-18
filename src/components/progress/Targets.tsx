'use client';
import { useFormatter, useTranslations } from 'next-intl';
import Paper from '@mui/material/Paper';
import SectionPanel from '@/components/shared/SectionPanel';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import type { TargetProgress } from '@/lib/target-progress';
import ToneChip from '@/components/shared/ToneChip';

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
  const tone =
    target.state === 'secure'
      ? 'success'
      : target.state === 'review-due'
        ? 'error'
        : target.state === 'learning'
          ? 'warning'
          : 'primary';
  return (
    <Paper
      component="li"
      variant="outlined"
      sx={{ p: 2, bgcolor: 'background.default', boxShadow: 'none', minWidth: 0 }}
    >
      <Stack sx={{ gap: 1.25 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
          <Typography component="h3" variant="subtitle1" sx={{ minInlineSize: 0 }}>
            {tags(target.tag)} · {target.level}
          </Typography>
          <ToneChip
            label={t('states.' + target.state)}
            size="small"
            tone={tone as 'success' | 'error' | 'warning' | 'primary'}
            sx={{ flexShrink: 0 }}
          />
        </Stack>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            gap: 1,
          }}
        >
          <Box sx={{ p: 1.25, bgcolor: 'background.paper', borderRadius: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              {t('firstLabel')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {rate(target.first)}
            </Typography>
          </Box>
          <Box sx={{ p: 1.25, bgcolor: 'background.paper', borderRadius: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              {t('latestLabel')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {rate(target.latest)}
            </Typography>
          </Box>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {t('total', { tasks: target.tasks, errors: target.errors, uses: target.uses })}
        </Typography>
        <Typography variant="caption" color="text.secondary">
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
    </Paper>
  );
}

export default function Targets({ targets }: { targets: TargetProgress[] }) {
  const t = useTranslations('progress.targets');
  return (
    <SectionPanel title={t('title')} headingComponent="h3" description={t('provisional')}>
      {targets.length ? (
        <Box
          component="ul"
          sx={{
            listStyle: 'none',
            p: 0,
            m: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 19rem), 1fr))',
            gap: 1.5,
          }}
        >
          {targets.map((target) => (
            <TargetRow key={`${target.level}:${target.tag}`} target={target} />
          ))}
        </Box>
      ) : (
        <Typography>{t('empty')}</Typography>
      )}
      <Typography variant="body2" color="text.secondary">
        {t('rule')}
      </Typography>
    </SectionPanel>
  );
}
