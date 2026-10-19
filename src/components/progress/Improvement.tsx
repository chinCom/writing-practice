'use client';
import { useFormatter, useTranslations } from 'next-intl';
import { useTheme } from '@mui/material/styles';
import SectionPanel from '@/components/shared/SectionPanel';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LineChart from './ProgressLineChart';
import { scoreKeys, type Improvement as ImprovementData } from '@/lib/improvement';

function WeeklyScoreChart({ weekly }: { weekly: ImprovementData['weekly'] }) {
  const t = useTranslations('progress');
  const format = useFormatter();
  const theme = useTheme();
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
    <SectionPanel title={t('improvementTitle')} headingComponent="h3" titleId="improvement-title">
      <Typography variant="body2">{t('unmatchedTrends')}</Typography>
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
    </SectionPanel>
  );
}
