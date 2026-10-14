'use client';
import NextLink from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import CheckCircle from '@mui/icons-material/CheckCircle';
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked';
import type { ProgressSummary } from '@/lib/progress';

export default function AccountActivity({
  progress,
  due,
  goal = 5,
}: {
  progress: ProgressSummary;
  due: number;
  goal?: number;
}) {
  const t = useTranslations('today');
  const format = useFormatter();
  return (
    <Stack sx={{ gap: 3 }}>
      <Typography variant="h3">{t('streak', { n: progress.streak })}</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 3, alignItems: { sm: 'center' } }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h3" sx={{ mb: 2 }}>
            {t('week')}
          </Typography>
          <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 0.5 }}>
            {progress.week.map((day) => {
              const date = new Date(day.date + 'T12:00:00Z');
              const name = format.dateTime(date, { weekday: 'long', timeZone: 'UTC' });
              return (
                <Stack
                  key={day.date}
                  role="img"
                  aria-label={t(day.written ? 'done' : 'future', { day: name })}
                  sx={{ alignItems: 'center', gap: 1 }}
                >
                  <Typography variant="caption">
                    {format.dateTime(date, { weekday: 'short', timeZone: 'UTC' })}
                  </Typography>
                  {day.written ? (
                    <CheckCircle color="success" />
                  ) : (
                    <RadioButtonUnchecked sx={{ color: 'divider' }} />
                  )}
                </Stack>
              );
            })}
          </Stack>
        </Box>
        <Box
          role="img"
          aria-label={t('weeklyCount', { done: progress.weeklySessions, goal })}
          sx={{
            position: 'relative',
            width: (theme) => theme.layout.ringSize,
            height: (theme) => theme.layout.ringSize,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <CircularProgress
            aria-hidden
            variant="determinate"
            value={100}
            size={96}
            thickness={4}
            sx={{ position: 'absolute', color: 'divider' }}
          />
          <CircularProgress
            aria-hidden
            variant="determinate"
            value={Math.min(100, (progress.weeklySessions / goal) * 100)}
            size={96}
            thickness={4}
            sx={{ position: 'absolute', color: 'success.main' }}
          />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="subtitle1">
              {t('goalCount', { done: progress.weeklySessions, goal })}
            </Typography>
            <Typography variant="caption">{t('sessions')}</Typography>
          </Box>
        </Box>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {t('utc')}
      </Typography>
      {due ? (
        <Button variant="outlined" component={NextLink} href="/practice">
          {t('due', { n: due })}
        </Button>
      ) : (
        <Typography>{t('noReviews')}</Typography>
      )}
      <Button component={NextLink} href="/progress" variant="text">
        {t('seeProgress')}
      </Button>
    </Stack>
  );
}
