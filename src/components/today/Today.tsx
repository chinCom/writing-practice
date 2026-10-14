'use client';
import NextLink from 'next/link';
import { useTranslations, useFormatter } from 'next-intl';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircle from '@mui/icons-material/CheckCircle';
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked';
import SavedFeedback, { type SavedSubmission } from './SavedFeedback';
import AccountActivity from './AccountActivity';
import type { ProgressSummary } from '@/lib/progress';

function NextTaskCard({ preview = false }: { preview?: boolean }) {
  const t = useTranslations('today');
  return (
    <Card>
      <CardContent sx={{ p: 2.5 }}>
        <Chip label="A2" color="primary" variant="tonal" size="small" sx={{ mb: 1.5 }} />
        <Typography variant="h2" sx={{ mb: 1.5 }}>
          {t('taskTitle')}
        </Typography>
        <Typography sx={{ mb: 1 }}>{t('description')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          {t('wordRange')}
        </Typography>
        <Button
          component={NextLink}
          href={preview ? '/dev/preview/write' : '/write/weekend'}
          variant="contained"
        >
          {t('start')}
        </Button>
        <Divider sx={{ my: 2 }} />
        <Typography variant="body2">{t('focus')}</Typography>
      </CardContent>
    </Card>
  );
}

function WeekOverview() {
  const t = useTranslations('today');
  const format = useFormatter();
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      sx={{ gap: 3, alignItems: { xs: 'stretch', sm: 'center' } }}
    >
      <Box sx={{ flex: 1 }}>
        <Typography variant="h3" sx={{ mb: 2 }}>
          {t('week')}
        </Typography>
        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
          {Array.from({ length: 7 }, (_, i) => {
            const day = new Date('2026-10-12T12:00:00Z');
            day.setUTCDate(day.getUTCDate() + i);
            const label = format.dateTime(day, { weekday: 'long' });
            return (
              <Stack
                key={i}
                role="img"
                sx={{ alignItems: 'center', gap: 1 }}
                aria-label={t(i < 2 ? 'done' : 'future', { day: label })}
              >
                <Typography variant="caption" color="text.secondary">
                  {format.dateTime(day, { weekday: 'short' })}
                </Typography>
                {i < 2 ? (
                  <CheckCircle sx={{ color: 'success.main' }} />
                ) : (
                  <RadioButtonUnchecked sx={{ color: 'divider' }} />
                )}
              </Stack>
            );
          })}
        </Stack>
      </Box>
      <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
      <Box sx={{ textAlign: { xs: 'start', sm: 'center' } }}>
        <Typography variant="h3" sx={{ mb: 1.5 }}>
          {t('goal')}
        </Typography>
        <Box
          role="img"
          aria-label={t('goalCount', { done: 3, goal: 5 }) + ' ' + t('sessions')}
          sx={{
            position: 'relative',
            width: (theme) => theme.layout.ringSize,
            height: (theme) => theme.layout.ringSize,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <CircularProgress
            aria-hidden="true"
            variant="determinate"
            value={100}
            size={96}
            thickness={4}
            sx={{ position: 'absolute', color: 'divider' }}
          />
          <CircularProgress
            aria-hidden="true"
            variant="determinate"
            value={60}
            size={96}
            thickness={4}
            sx={{ position: 'absolute', color: 'success.main' }}
          />
          <Box>
            <Typography variant="subtitle1">{t('goalCount', { done: 3, goal: 5 })}</Typography>
            <Typography variant="caption" color="text.secondary">
              {t('sessions')}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Stack>
  );
}

function ReviewPrompt() {
  const t = useTranslations('today');
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      sx={{
        gap: 2,
        alignItems: { xs: 'stretch', sm: 'center' },
        justifyContent: 'space-between',
      }}
    >
      <Box>
        <Typography variant="subtitle1">{t('reviewTitle')}</Typography>
        <Typography variant="caption" color="text.secondary">
          {t('reviewDescription')}
        </Typography>
      </Box>
      <Button component={NextLink} href="/practice" variant="outlined">
        {t('review')}
      </Button>
    </Stack>
  );
}

function LearningEmptyState() {
  const t = useTranslations('today');
  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h3" sx={{ mb: 1 }}>
        {t('emptyTitle')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {t('emptyBody')}
      </Typography>
      {process.env.NODE_ENV === 'development' ? (
        <Button variant="contained" component={NextLink} href="/dev/preview/today">
          {t('preview')}
        </Button>
      ) : null}
    </Box>
  );
}

export default function Today({
  preview = false,
  signedIn = false,
  submissions = [],
  progress,
  due = 0,
  weeklyGoal = 5,
}: {
  preview?: boolean;
  signedIn?: boolean;
  submissions?: SavedSubmission[];
  progress?: ProgressSummary;
  due?: number;
  weeklyGoal?: number;
}) {
  const t = useTranslations('today');
  const format = useFormatter();
  const date = new Date('2026-10-13T12:00:00Z');
  return (
    <Container data-testid="today-layout" maxWidth={false} disableGutters>
      <Typography variant="h1" sx={{ mb: 1 }}>
        {t('title')}
      </Typography>
      {preview ? (
        <>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {format.dateTime(date, { weekday: 'long', month: 'long', day: 'numeric' })}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
              gap: 4,
              alignItems: 'start',
            }}
          >
            <NextTaskCard preview />
            <Stack sx={{ gap: 3, py: 2 }}>
              <WeekOverview />
              <Divider />
              <ReviewPrompt />
            </Stack>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 4 }}>
            {t('localNotice')}
          </Typography>
        </>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
            gap: 4,
            mt: 3,
            alignItems: 'start',
          }}
        >
          <NextTaskCard />
          {signedIn ? (
            <Stack sx={{ gap: 4 }}>
              {progress ? (
                <AccountActivity progress={progress} due={due} goal={weeklyGoal} />
              ) : null}
              <Button component={NextLink} href="/path" variant="outlined">
                {t('learningPath')}
              </Button>
              <SavedFeedback submissions={submissions} />
            </Stack>
          ) : (
            <LearningEmptyState />
          )}
        </Box>
      )}
    </Container>
  );
}
