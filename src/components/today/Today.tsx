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
import ShowChart from '@mui/icons-material/ShowChart';
import SavedFeedback, { type SavedSubmission } from './SavedFeedback';
import AccountActivity from './AccountActivity';
import LearningSnapshot, { type LearningSnapshotData } from './LearningSnapshot';
import type { ProgressReport } from '@/lib/db/progress';
import type { NextTask } from '@/lib/next-task';

function WeekendTaskCard({ preview }: { preview: boolean }) {
  const t = useTranslations('today');
  return (
    <Card data-testid="today-task">
      <CardContent sx={{ p: 2.75, '&:last-child': { pb: 1.75 } }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.625, mb: 1.75 }}>
          <Chip label="A2" color="primary" variant="tonal" size="small" />
          <Typography variant="body2">{t('taskLabel')}</Typography>
        </Stack>
        <Typography variant="h2" sx={{ mb: 0.75 }}>
          {t('taskTitle')}
        </Typography>
        <Typography sx={{ mb: 0.5 }}>{t('description')}</Typography>
        <Typography variant="body2" sx={{ mb: 2.125 }}>
          {t('wordRange')}
        </Typography>
        <Divider />
        <Box
          sx={{
            bgcolor: 'background.default',
            borderRadius: 1,
            minHeight: 130,
            display: 'flex',
            alignItems: 'center',
            py: 4.75,
            px: 3,
            mb: 2.75,
          }}
        >
          <Typography variant="canvas" sx={{ fontStyle: 'italic', lineHeight: 1.5 }}>
            {t('opening')}
          </Typography>
        </Box>
        <Button
          component={NextLink}
          href={preview ? '/dev/preview/write' : '/write/weekend'}
          variant="contained"
        >
          {t('start')}
        </Button>
        <Divider sx={{ mt: 2.5, mb: 1.75 }} />
        <Typography variant="body2">{t('focus')}</Typography>
      </CardContent>
    </Card>
  );
}
function LessonTaskCard({
  next,
  preview,
}: {
  next: Extract<NextTask, { kind: 'lesson' }>;
  preview: boolean;
}) {
  const t = useTranslations('today');
  const tags = useTranslations('feedback.tags');
  const format = useFormatter();
  return (
    <Card data-testid="today-task">
      <CardContent>
        <Stack sx={{ gap: 2 }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
            <Chip label={next.level} color="primary" variant="tonal" size="small" />
            <Typography variant="body2">{t('taskLabel')}</Typography>
          </Stack>
          <Typography variant="h2">{next.lessonTitle}</Typography>
          <Typography variant="subtitle1">{next.unitTitle}</Typography>
          <Typography
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {next.prompt}
          </Typography>
          <Typography variant="body2">
            {t('lessonWordRange', { min: next.minWords, max: next.maxWords })}
          </Typography>
          <Button
            component={NextLink}
            href={preview ? '/dev/preview/write' : next.href}
            variant="contained"
            sx={{ alignSelf: 'start' }}
          >
            {t(next.warmupsDone ? 'continueWriting' : 'startLesson')}
          </Button>
          <Divider />
          <Typography variant="body2">
            {t('lessonFocus', { tags: format.list(next.focus.map((tag) => tags(tag))) })}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

function PlacementTaskCard({ preview }: { preview: boolean }) {
  const t = useTranslations('today');
  return (
    <Card data-testid="today-task">
      <CardContent>
        <Stack sx={{ gap: 2 }}>
          <Typography variant="h2">{t('placementTitle')}</Typography>
          <Typography>{t('placementBody')}</Typography>
          <Button
            component={NextLink}
            href={preview ? '/dev/preview/write' : '/placement'}
            variant="contained"
            sx={{ alignSelf: 'start' }}
          >
            {t('startPlacement')}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

function NextTaskCard({ next, preview }: { next?: NextTask; preview: boolean }) {
  if (next?.kind === 'lesson') return <LessonTaskCard next={next} preview={preview} />;
  if (next?.kind === 'placement') return <PlacementTaskCard preview={preview} />;
  return <WeekendTaskCard preview={preview} />;
}

function ReviewPrompt({
  due,
  preview,
  pastTense,
}: {
  due: number;
  preview: boolean;
  pastTense: boolean;
}) {
  const t = useTranslations('today');
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      sx={{
        gap: 2,
        alignItems: { xs: 'stretch', sm: 'center' },
        justifyContent: 'space-between',
        bgcolor: 'highlighter.light',
        border: 1,
        borderColor: 'highlighter.main',
        borderRadius: 1.25,
        py: 1.5,
        px: 3,
      }}
    >
      <Stack direction="row" sx={{ gap: 3.75, alignItems: 'center' }}>
        <ShowChart sx={{ fontSize: '3rem' }} />
        <Box>
          <Typography variant="subtitle1" component="h2">
            {t(pastTense ? 'reviewTitle' : 'reviewGeneral')}
          </Typography>
          <Typography variant="body2">{t('reviewReady', { n: due })}</Typography>
        </Box>
      </Stack>
      <Button
        component={NextLink}
        href={preview ? '/dev/preview/practice-page' : '/practice'}
        variant="outlined"
        sx={{ flexShrink: 0, borderColor: 'primary.main' }}
      >
        {t('due', { n: due })}
      </Button>
    </Stack>
  );
}
export default function Today({
  preview = false,
  signedIn = false,
  submissions = [],
  progress,
  due = 0,
  weeklyGoal = 5,
  path,
  pastTense = false,
  now,
  next,
}: {
  preview?: boolean;
  signedIn?: boolean;
  submissions?: SavedSubmission[];
  progress?: ProgressReport;
  next?: NextTask;
  due?: number;
  weeklyGoal?: number;
  path?: LearningSnapshotData;
  pastTense?: boolean;
  now?: string;
}) {
  const t = useTranslations('today');
  const format = useFormatter();
  const date = new Date(now ?? progress?.asOf ?? new Date().toISOString());
  const account = preview || signedIn;
  return (
    <Container data-testid="today-layout" maxWidth={false} disableGutters>
      <Typography variant="h1" sx={{ mb: 1 }}>
        {t('title')}
      </Typography>
      <Typography sx={{ mb: 3, fontWeight: 550, lineHeight: 1.2 }}>
        {format.dateTime(date, { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1.45fr) minmax(0, 1fr)' },
          gap: 2,
          alignItems: 'stretch',
        }}
      >
        <NextTaskCard next={next} preview={preview} />
        {account && progress ? (
          <AccountActivity progress={progress} goal={weeklyGoal} preview={preview} />
        ) : (
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h3" component="h2" sx={{ mb: 2 }}>
                {t('emptyTitle')}
              </Typography>
              <Typography color="text.secondary">{t('emptyBody')}</Typography>
              {process.env.NODE_ENV === 'development' ? (
                <Button
                  variant="outlined"
                  component={NextLink}
                  href="/dev/preview/today"
                  sx={{ mt: 3 }}
                >
                  {t('preview')}
                </Button>
              ) : null}
            </CardContent>
          </Card>
        )}
      </Box>
      {account ? (
        <>
          <Box sx={{ my: 2.25 }}>
            {due > 0 ? (
              <ReviewPrompt due={due} preview={preview} pastTense={pastTense} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('noReviews')}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1.46fr) minmax(0, 1fr)' },
              gap: 2,
            }}
          >
            <SavedFeedback submissions={submissions} preview={preview} />
            <Stack sx={{ gap: 2 }}>
              <LearningSnapshot path={path} preview={preview} />
              <Card>
                <CardContent>
                  <Stack sx={{ gap: 1.5 }}>
                    <Typography component="h2" variant="h3">
                      {t('ieltsTitle')}
                    </Typography>
                    <Typography variant="body2">{t('ieltsIntro')}</Typography>
                    <Button
                      component={NextLink}
                      variant="outlined"
                      href={
                        preview ? '/dev/preview/path?course=full&track=ielts' : '/path?track=ielts'
                      }
                    >
                      {t('ieltsTitle')}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Box>
        </>
      ) : null}
      {preview ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
          {t('localNotice')}
        </Typography>
      ) : null}
    </Container>
  );
}
