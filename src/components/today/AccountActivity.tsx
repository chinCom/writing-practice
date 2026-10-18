'use client';

import { useEffect, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import CheckCircle from '@mui/icons-material/CheckCircle';
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked';
import LocalFireDepartmentOutlined from '@mui/icons-material/LocalFireDepartmentOutlined';
import ArrowForward from '@mui/icons-material/ArrowForward';
import { tickPop } from '@/theme/theme';
import type { ProgressReport } from '@/lib/db/progress';
import { scoreKeys, type Improvement } from '@/lib/improvement';
import NavigationButton from '@/components/shared/NavigationButton';

function ImprovementHighlight({ improvement }: { improvement: Improvement }) {
  const t = useTranslations('today');
  const skills = useTranslations('progress');
  const format = useFormatter();
  const comparison = improvement.thenVsNow;
  if (!comparison)
    return (
      <Typography variant="body2" color="text.secondary">
        {t('keepWriting', { n: improvement.checksNeeded })}
      </Typography>
    );
  const strongest = scoreKeys.reduce((best, key) =>
    comparison.now[key] - comparison.then[key] > comparison.now[best] - comparison.then[best]
      ? key
      : best,
  );
  if (comparison.now[strongest] <= comparison.then[strongest])
    return (
      <Typography variant="body2" color="text.secondary">
        {t('steady')}
      </Typography>
    );
  return (
    <Stack sx={{ gap: 0.75 }}>
      <Typography variant="body2">
        {t('improving', {
          skill: skills(strongest),
          then: format.number(comparison.then[strongest], { maximumFractionDigits: 1 }),
          now: format.number(comparison.now[strongest], { maximumFractionDigits: 1 }),
        })}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {skills('improvementDisclaimer')}
      </Typography>
    </Stack>
  );
}

// Start at zero, then move to the real value so the ring fills once after the page appears.
function useFillIn(value: number) {
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return filled ? value : 0;
}

export default function AccountActivity({
  progress,
  goal = 5,
  preview = false,
}: {
  progress: ProgressReport;
  goal?: number;
  preview?: boolean;
}) {
  const t = useTranslations('today');
  const format = useFormatter();
  const goalMet = progress.weeklySessions >= goal;
  const percent = Math.min(100, (progress.weeklySessions / goal) * 100);
  const ringValue = useFillIn(percent);
  const ringSize = 140;

  return (
    <Card data-testid="today-week" sx={{ height: '100%' }}>
      <CardContent
        sx={{
          p: { xs: 2.5, md: 3.5 },
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          '&:last-child': { pb: { xs: 2.5, md: 3.5 } },
        }}
      >
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}
        >
          <Typography variant="h2" component="h2">
            {t('week')}
          </Typography>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
            <LocalFireDepartmentOutlined sx={{ color: 'warning.main', fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {t('streak', { n: progress.streak })}
            </Typography>
          </Stack>
        </Stack>
        <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 3, gap: 0.5 }}>
          {progress.week.map((day, order) => {
            const date = new Date(day.date + 'T12:00:00Z');
            const name = format.dateTime(date, { weekday: 'long', timeZone: 'UTC' });
            const current = day.date === progress.asOf.slice(0, 10);
            return (
              <Stack
                key={day.date}
                role="img"
                aria-label={t(day.written ? 'done' : 'future', { day: name })}
                sx={{ alignItems: 'center', gap: 0.75 }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: current ? 'text.primary' : 'text.secondary', fontWeight: 600 }}
                >
                  {format.dateTime(date, { weekday: 'short', timeZone: 'UTC' })}
                </Typography>
                <Box
                  sx={{
                    inlineSize: 34,
                    blockSize: 34,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    border: 2,
                    borderColor: current ? 'success.main' : 'transparent',
                    bgcolor: day.written ? 'tonal.success' : 'transparent',
                  }}
                >
                  {day.written ? (
                    <CheckCircle
                      sx={{
                        color: 'success.main',
                        fontSize: 26,
                        '@media (prefers-reduced-motion: no-preference)': {
                          animation: `${tickPop} 220ms cubic-bezier(0.22, 0.7, 0.2, 1) backwards`,
                          animationDelay: order * 70 + 'ms',
                        },
                      }}
                    />
                  ) : (
                    <RadioButtonUnchecked sx={{ color: 'divider', fontSize: 26 }} />
                  )}
                </Box>
              </Stack>
            );
          })}
        </Stack>
        <Divider sx={{ my: 2.5 }} />
        <Stack direction="row" sx={{ alignItems: 'center', gap: { xs: 2, sm: 3 }, flex: 1 }}>
          <Box
            role="img"
            aria-label={t(goalMet ? 'weeklyCountMet' : 'weeklyCount', {
              done: progress.weeklySessions,
              goal,
            })}
            sx={{
              position: 'relative',
              width: ringSize,
              height: ringSize,
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <CircularProgress
              aria-hidden
              variant="determinate"
              value={100}
              size={ringSize}
              thickness={4}
              sx={{ position: 'absolute', color: 'divider' }}
            />
            <CircularProgress
              aria-hidden
              variant="determinate"
              value={ringValue}
              size={ringSize}
              thickness={4}
              sx={{ position: 'absolute', color: 'success.main' }}
            />
            <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
              <Typography variant="stat" component="p" sx={{ fontSize: '2rem' }}>
                {progress.weeklySessions}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {goalMet ? t('goalMet') : t('goalCount', { done: progress.weeklySessions, goal })}
              </Typography>
            </Box>
          </Box>
          <Stack sx={{ gap: 1.25, minInlineSize: 0 }}>
            <Typography variant="body2" color="text.secondary">
              {t('revisions')}
            </Typography>
            <ImprovementHighlight improvement={progress.improvement} />
          </Stack>
        </Stack>
        <NavigationButton
          href={preview ? '/dev/preview/progress' : '/progress'}
          tone="secondary"
          endIcon={<ArrowForward />}
          fullWidth
          sx={{ mt: 2.5 }}
        >
          {t('seeProgress')}
        </NavigationButton>
      </CardContent>
    </Card>
  );
}
