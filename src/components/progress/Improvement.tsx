'use client';
import { useFormatter, useTranslations } from 'next-intl';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import { LineChart } from '@mui/x-charts/LineChart';
import { scoreKeys, type Improvement as ImprovementData } from '@/lib/improvement';

function ChangeChip({ delta, lowerIsBetter = false }: { delta: number; lowerIsBetter?: boolean }) {
  const format = useFormatter();
  const improving = lowerIsBetter ? delta < 0 : delta > 0;
  return (
    <Chip
      size="small"
      color={improving ? 'success' : 'default'}
      variant={improving ? 'tonal' : 'outlined'}
      label={format.number(delta, { signDisplay: 'exceptZero', maximumFractionDigits: 1 })}
    />
  );
}

function ThenVsNowTable({ comparison }: { comparison: NonNullable<ImprovementData['thenVsNow']> }) {
  const t = useTranslations('progress');
  const format = useFormatter();
  return (
    <Stack sx={{ gap: 2 }}>
      <Typography component="h3" variant="h3">
        {t('thenVsNow')}
      </Typography>
      <TableContainer>
        <Table size="small" aria-label={t('thenVsNow')} sx={{ fontVariantNumeric: 'tabular-nums' }}>
          <TableHead>
            <TableRow>
              {(['skill', 'then', 'now', 'change'] as const).map((key) => (
                <TableCell key={key}>{t(key)}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {([...scoreKeys, 'average', 'errorsPer100Words'] as const).map((key) => (
              <TableRow key={key}>
                <TableCell component="th" scope="row">
                  {t(key === 'errorsPer100Words' ? 'errorRate' : key)}
                </TableCell>
                <TableCell>
                  {format.number(comparison.then[key], { maximumFractionDigits: 1 })}
                </TableCell>
                <TableCell>
                  {format.number(comparison.now[key], { maximumFractionDigits: 1 })}
                </TableCell>
                <TableCell>
                  <ChangeChip
                    delta={comparison.now[key] - comparison.then[key]}
                    lowerIsBetter={key === 'errorsPer100Words'}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

function WeeklyScoreChart({ weekly }: { weekly: ImprovementData['weekly'] }) {
  const t = useTranslations('progress');
  const format = useFormatter();
  const theme = useTheme();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const colors = [
    theme.palette.primary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
  ];
  const summary = t('trendSummary', {
    then: format.number(weekly[0].average),
    now: format.number(weekly[weekly.length - 1].average),
  });
  return (
    <Box sx={{ minInlineSize: 0 }}>
      <Typography component="h3" variant="h3">
        {t('weeklyScores')}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {summary}
      </Typography>
      <Box role="img" aria-label={summary}>
        <LineChart
          height={300}
          skipAnimation={reducedMotion}
          xAxis={[
            {
              data: weekly.map((week) => new Date(week.weekStart + 'T00:00:00Z')),
              scaleType: 'time',
              valueFormatter: (date) =>
                format.dateTime(date, { month: 'short', day: 'numeric', timeZone: 'UTC' }),
            },
          ]}
          yAxis={[{ min: 0, max: 5, tickInterval: [0, 1, 2, 3, 4, 5] }]}
          series={scoreKeys.map((key, index) => ({
            id: key,
            label: t(key),
            data: weekly.map((week) => week[key]),
            color: colors[index],
          }))}
        />
      </Box>
    </Box>
  );
}

function WeeklyErrorChart({ weekly }: { weekly: ImprovementData['weekly'] }) {
  const t = useTranslations('progress');
  const format = useFormatter();
  const theme = useTheme();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const summary = t('errorTrendSummary', {
    then: format.number(weekly[0].errorsPer100Words),
    now: format.number(weekly[weekly.length - 1].errorsPer100Words),
  });
  return (
    <Box sx={{ minInlineSize: 0 }}>
      <Typography component="h3" variant="h3">
        {t('weeklyErrors')}
      </Typography>
      <Box role="img" aria-label={summary}>
        <LineChart
          height={260}
          skipAnimation={reducedMotion}
          xAxis={[
            {
              data: weekly.map((week) => new Date(week.weekStart + 'T00:00:00Z')),
              scaleType: 'time',
              valueFormatter: (date) =>
                format.dateTime(date, { month: 'short', day: 'numeric', timeZone: 'UTC' }),
            },
          ]}
          yAxis={[{ min: 0 }]}
          series={[
            {
              id: 'errorsPer100Words',
              label: t('errorRate'),
              data: weekly.map((week) => week.errorsPer100Words),
              color: theme.palette.info.main,
            },
          ]}
        />
      </Box>
    </Box>
  );
}

function RevisionGainNote({ gain }: { gain: NonNullable<ImprovementData['revisionGain']> }) {
  const t = useTranslations('progress');
  const format = useFormatter();
  return (
    <Typography variant="body2">
      {t('revisionGain', {
        n: gain.pairs,
        delta: format.number(gain.averageDelta, {
          signDisplay: 'exceptZero',
          maximumFractionDigits: 1,
        }),
      })}
    </Typography>
  );
}

export default function Improvement({ data }: { data: ImprovementData }) {
  const t = useTranslations('progress');
  return (
    <Paper component="section" aria-labelledby="improvement-title" sx={{ p: 3, minInlineSize: 0 }}>
      <Stack sx={{ gap: 3 }}>
        <Typography id="improvement-title" variant="h2">
          {t('improvementTitle')}
        </Typography>
        {data.thenVsNow ? (
          <ThenVsNowTable comparison={data.thenVsNow} />
        ) : (
          <Typography>{t('checksNeeded', { n: data.checksNeeded })}</Typography>
        )}
        {data.weekly.length >= 2 ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))',
              gap: 3,
            }}
          >
            <WeeklyScoreChart weekly={data.weekly} />
            <WeeklyErrorChart weekly={data.weekly} />
          </Box>
        ) : null}
        {data.revisionGain ? <RevisionGainNote gain={data.revisionGain} /> : null}
        <Typography variant="caption" color="text.secondary">
          {t('improvementDisclaimer')}
        </Typography>
      </Stack>
    </Paper>
  );
}
