'use client';
import { fetchWithStatus } from '@/lib/network-status';
import { useEffect, useState } from 'react';
import NextLink from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { LineChart } from '@mui/x-charts/LineChart';
import type { ProgressSummary } from '@/lib/progress';
import { tickPop } from '@/theme/theme';
import ReviewInsights from './ReviewInsights';
import Improvement from './Improvement';
import Benchmarks from './Benchmarks';
import Targets from './Targets';
import { CourseProgressPanel } from './CourseProgress';
import type { ProgressPageData } from '@/lib/db/progress';

const levels = ['PRE_A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
function ActivityCalendar({ data }: { data: ProgressSummary }) {
  const t = useTranslations('progress');
  const format = useFormatter();
  const today = new Date(data.asOf);
  const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const count = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const todayKey = today.toISOString().slice(0, 10);
  let writtenOrder = 0;
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h3" sx={{ mb: 2 }}>
        {format.dateTime(first, { month: 'long', year: 'numeric', timeZone: 'UTC' })}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.5 }}>
        {Array.from({ length: 7 }, (_, index) => (
          <Typography key={'weekday-' + index} variant="caption" align="center">
            {format.dateTime(new Date(Date.UTC(2026, 9, 12 + index)), {
              weekday: 'short',
              timeZone: 'UTC',
            })}
          </Typography>
        ))}
        {Array.from({ length: offset }, (_, index) => (
          <Box key={'space-' + index} aria-hidden />
        ))}
        {Array.from({ length: count }, (_, index) => {
          const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), index + 1));
          const key = date.toISOString().slice(0, 10);
          const written = data.writingDays.includes(key);
          const current = key === todayKey;
          const order = written ? writtenOrder++ : 0;
          const label = format.dateTime(date, {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
          });
          return (
            <Box
              key={index}
              role="img"
              aria-current={current ? 'date' : undefined}
              aria-label={t(written ? 'writingDay' : 'noWriting', { date: label })}
              sx={{
                aspectRatio: '1',
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                bgcolor: written ? 'success.dark' : 'transparent',
                color: written ? 'success.contrastText' : 'text.primary',
                outline: current ? '2px solid' : 'none',
                outlineColor: 'primary.main',
                outlineOffset: 2,
                '@media (prefers-reduced-motion: no-preference)': written
                  ? {
                      animation: `${tickPop} 220ms cubic-bezier(0.22, 0.7, 0.2, 1) backwards`,
                      animationDelay: order * 70 + 'ms',
                    }
                  : {},
              }}
            >
              <Typography variant="caption">{index + 1}</Typography>
            </Box>
          );
        })}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        {t('utc')}
      </Typography>
    </Paper>
  );
}
export function ProgressPanels({
  data,
  preview = false,
}: {
  data: ProgressPageData;
  preview?: boolean;
}) {
  const t = useTranslations('progress');
  const format = useFormatter();
  const theme = useTheme();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const maximum = Math.max(1, ...data.errors.map((item) => item.count));
  return (
    <Stack sx={{ gap: 3 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ gap: 3, justifyContent: 'space-between' }}
      >
        {(['words', 'sessions', 'streak', 'xp'] as const).map((key) => (
          <Box key={key} role="group" aria-label={t(key)} sx={{ flex: 1 }}>
            <Typography variant="stat">{format.number(data[key])}</Typography>
            <Typography color="text.secondary">{t(key)}</Typography>
          </Box>
        ))}
      </Stack>
      <Targets targets={data.targets} />
      <Benchmarks comparisons={data.benchmarks} />
      <Improvement data={data.improvement} />
      <CourseProgressPanel course={data.course} preview={preview} />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 18rem), 1fr))',
          gap: 3,
          alignItems: 'start',
        }}
      >
        <Paper sx={{ p: 3, minWidth: 0 }}>
          <Typography variant="h3">{t('level')}</Typography>
          {data.trajectory.length ? (
            <LineChart
              height={260}
              skipAnimation={reducedMotion}
              xAxis={[
                {
                  data: data.trajectory.map((item) => new Date(item.at)),
                  scaleType: 'time',
                  valueFormatter: (date) =>
                    format.dateTime(date, { month: 'short', day: 'numeric', timeZone: 'UTC' }),
                },
              ]}
              yAxis={[
                {
                  min: 0,
                  max: 6,
                  width: 65,
                  tickInterval: [0, 1, 2, 3, 4, 5, 6],
                  valueFormatter: (value: number) => levels[value] ?? '',
                },
              ]}
              series={[
                {
                  data: data.trajectory.map((item) => levels.indexOf(item.level)),
                  color: theme.palette.success.main,
                  area: true,
                  showMark: true,
                  label: t('estimate'),
                  valueFormatter: (value) => (value === null ? '' : levels[value]),
                },
              ]}
            />
          ) : (
            <Typography sx={{ my: 3 }}>{t('empty')}</Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {t('disclaimer')}
          </Typography>
        </Paper>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h3" sx={{ mb: 2 }}>
            {t('errors')}
          </Typography>
          {data.errors.length ? (
            <Stack component="ul" sx={{ listStyle: 'none', p: 0, m: 0, gap: 2 }}>
              {data.errors.map((item) => (
                <Box component="li" key={item.group}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                    <Typography variant="body2">{t(item.group)}</Typography>
                    <Typography variant="body2">{format.number(item.count)}</Typography>
                  </Stack>
                  <LinearProgress
                    aria-label={t('errorCount', { category: t(item.group), n: item.count })}
                    value={(item.count / maximum) * 100}
                    variant="determinate"
                    sx={{ mt: 1 }}
                  />
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography>{t('noErrors')}</Typography>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            {t('errorNote')}
          </Typography>
        </Paper>
        <ActivityCalendar data={data} />
      </Box>
      <ReviewInsights skills={data.skills} />
      <Typography variant="body2" color="text.secondary">
        {t('xpNote')}
      </Typography>
    </Stack>
  );
}
export default function Progress({
  preview = false,
  variant,
}: {
  preview?: boolean;
  variant?: 'empty';
}) {
  const t = useTranslations('progress');
  const [data, setData] = useState<ProgressPageData | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 15000);
    fetchWithStatus(
      preview
        ? '/dev/preview/progress-data' + (variant === 'empty' ? '?variant=empty' : '')
        : '/api/progress',
      {
        signal: controller.signal,
        cache: 'no-store',
      },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error(response.status === 401 ? 'session' : 'loadError');
        const body = await response.json();
        if (!controller.signal.aborted) setData(body.data);
      })
      .catch((reason) => {
        if (active) setError(reason.message === 'session' ? 'session' : 'loadError');
      })
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [attempt, preview, variant]);
  return (
    <Stack sx={{ gap: 3 }}>
      <Typography variant="h1">{t('title')}</Typography>
      {data ? (
        <ProgressPanels data={data} preview={preview} />
      ) : error ? (
        <Alert
          severity="warning"
          action={
            error === 'session' ? (
              <Button component={NextLink} href="/login">
                {t('signIn')}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setError('');
                  setAttempt((value) => value + 1);
                }}
              >
                {t('retry')}
              </Button>
            )
          }
        >
          {t(error)}
        </Alert>
      ) : (
        <LinearProgress aria-label={t('loading')} />
      )}
    </Stack>
  );
}
