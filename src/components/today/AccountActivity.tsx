'use client';
import NextLink from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CheckCircle from '@mui/icons-material/CheckCircle';
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked';
import type { ProgressSummary } from '@/lib/progress';

export default function AccountActivity({
  progress,
  goal = 5,
  preview = false,
}: {
  progress: ProgressSummary;
  goal?: number;
  preview?: boolean;
}) {
  const t = useTranslations('today');
  const format = useFormatter();
  return (
    <Card data-testid="today-week" sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3, height: '100%' }}>
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}
        >
          <Typography variant="h2" component="h2" sx={{ lineHeight: 1.05 }}>
            {t('week')}
          </Typography>
          <Typography variant="subtitle1" component="p" sx={{ fontSize: '1.125rem' }}>
            {t('streak', { n: progress.streak })}
          </Typography>
        </Stack>
        <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 4, gap: 0.5 }}>
          {progress.week.map((day) => {
            const date = new Date(day.date + 'T12:00:00Z');
            const name = format.dateTime(date, { weekday: 'long', timeZone: 'UTC' });
            const current = day.date === progress.asOf.slice(0, 10);
            return (
              <Stack
                key={day.date}
                role="img"
                aria-label={t(day.written ? 'done' : 'future', { day: name })}
                sx={{ alignItems: 'center', gap: 1 }}
              >
                <Typography variant="body2">
                  {format.dateTime(date, { weekday: 'short', timeZone: 'UTC' })}
                </Typography>
                <Box
                  sx={{
                    border: 2,
                    borderColor: current ? 'success.main' : 'transparent',
                    borderRadius: '50%',
                    p: 0.5,
                    display: 'flex',
                  }}
                >
                  {day.written ? (
                    <CheckCircle sx={{ color: 'success.main', fontSize: '2rem' }} />
                  ) : (
                    <RadioButtonUnchecked sx={{ color: 'divider', fontSize: '2rem' }} />
                  )}
                </Box>
              </Stack>
            );
          })}
        </Stack>
        <Stack direction="row" sx={{ alignItems: 'center', gap: { xs: 2, sm: 4 }, mt: 6 }}>
          <Box
            role="img"
            aria-label={t('weeklyCount', { done: progress.weeklySessions, goal })}
            sx={{
              position: 'relative',
              width: (theme) => theme.layout.ringSize,
              height: (theme) => theme.layout.ringSize,
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <CircularProgress
              aria-hidden
              variant="determinate"
              value={100}
              size={150}
              thickness={3.2}
              sx={{ position: 'absolute', color: 'divider' }}
            />
            <CircularProgress
              aria-hidden
              variant="determinate"
              value={Math.min(100, (progress.weeklySessions / goal) * 100)}
              size={150}
              thickness={3.2}
              sx={{ position: 'absolute', color: 'success.main' }}
            />
            <Box
              sx={{
                textAlign: 'center',
                position: 'relative',
                bgcolor: 'background.paper',
                zIndex: 1,
              }}
            >
              <Typography variant="subtitle1" component="p">
                {t('goalCount', { done: progress.weeklySessions, goal })}
              </Typography>
              <Typography variant="caption">{t('sessions')}</Typography>
            </Box>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {t('revisions')}
            </Typography>
            <Button
              component={NextLink}
              href={preview ? '/dev/preview/progress' : '/progress'}
              sx={{ px: 0, justifyContent: 'start' }}
            >
              {t('seeProgress')}
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
