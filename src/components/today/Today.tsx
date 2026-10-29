'use client';

import type { ReactNode } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import ShowChart from '@mui/icons-material/ShowChart';
import ArrowForward from '@mui/icons-material/ArrowForward';
import AccessTimeOutlined from '@mui/icons-material/AccessTimeOutlined';
import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined';
import LayersOutlined from '@mui/icons-material/LayersOutlined';
import LinkOutlined from '@mui/icons-material/LinkOutlined';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import SavedFeedback, { type SavedSubmission } from './SavedFeedback';
import AccountActivity from './AccountActivity';
import LearningSnapshot, { type LearningSnapshotData } from './LearningSnapshot';
import type { ProgressReport } from '@/lib/db/progress';
import type { CurriculumTrack } from '@/lib/curriculum';
import type { NextTask } from '@/lib/next-task';
import type { GoalSummary } from '@/lib/goal';
import GoalCard from '@/components/goal/GoalCard';
import type { FirstSessionGuideState } from '@/lib/first-session';
import FirstSessionGuide from '@/components/onboarding/FirstSessionGuide';
import TargetRecommendations from '@/components/curriculum/TargetRecommendations';
import PageHeader from '@/components/shared/PageHeader';
import PaperAccent from '@/components/ui/icons/PaperAccent';
import CalloutRibbon from '@/components/ui/icons/CalloutRibbon';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import BoardIcon from '@/components/ui/icons/BoardIcon';
import NavigationButton from '@/components/shared/NavigationButton';
import ToneChip from '@/components/shared/ToneChip';
import SectionTitle from '@/components/shared/SectionTitle';

const focusIcons: Record<string, typeof AccessTimeOutlined> = {
  'verb-tense': AccessTimeOutlined,
  connectors: LinkOutlined,
  prepositions: LayersOutlined,
  'topic-sentence': ChatBubbleOutlineOutlined,
  'subject-verb': LayersOutlined,
  articles: ChatBubbleOutlineOutlined,
};

function WeekendTaskCard({ preview }: { preview: boolean }) {
  const t = useTranslations('today');
  return (
    <Card data-testid="today-task" sx={{ height: '100%' }}>
      <CardContent
        sx={{
          p: { xs: 2.5, md: 3.5 },
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          '&:last-child': { pb: { xs: 2.5, md: 3.5 } },
        }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25, mb: 2 }}>
          <ToneChip label="A2" tone="primary" size="small" />
          <Typography variant="body2" color="text.secondary">
            {t('taskLabel')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ marginInlineStart: 'auto' }}>
            {t('wordRange')}
          </Typography>
        </Stack>
        <Typography variant="h2" sx={{ mb: 1 }}>
          {t('taskTitle')}
        </Typography>
        <Typography sx={{ mb: 0.5 }}>{t('description')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          {t('wordRange')}
        </Typography>
        <Box
          sx={{
            bgcolor: 'background.default',
            borderRadius: 3,
            minHeight: 116,
            display: 'flex',
            alignItems: 'center',
            py: 3,
            px: 3,
            mb: 2.5,
          }}
        >
          <Typography variant="canvas" sx={{ fontStyle: 'italic', lineHeight: 1.5 }}>
            {t('opening')}
          </Typography>
        </Box>
        <NavigationButton
          href={preview ? '/dev/preview/write' : '/write/weekend'}
          tone="primary"
          endIcon={<ArrowForward />}
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('start')}
        </NavigationButton>
        <Divider sx={{ mt: 3, mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          {t('focus')}
        </Typography>
      </CardContent>
    </Card>
  );
}

function FocusChips({ focus }: { focus: string[] }) {
  const t = useTranslations('today');
  const tags = useTranslations('feedback.tags');
  return (
    <Stack sx={{ gap: 1.25 }}>
      <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
        <BoardIcon name="target" sx={{ color: 'primary.main', fontSize: 22 }} />
        <Typography variant="body2" color="text.secondary">
          {t('focusTitle')}
        </Typography>
      </Stack>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
        {focus.map((tag) => {
          const Icon = focusIcons[tag] ?? AutoAwesomeOutlined;
          return (
            <ToneChip
              key={tag}
              icon={<Icon />}
              label={tags(tag)}
              tone="primary"
              sx={{ height: 34 }}
            />
          );
        })}
      </Stack>
    </Stack>
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
  return (
    <Card data-testid="today-task" sx={{ height: '100%' }}>
      <CardContent
        sx={{
          p: { xs: 2.5, md: 3.5 },
          height: '100%',
          '&:last-child': { pb: { xs: 2.5, md: 3.5 } },
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) 168px' },
            gap: 2,
            alignItems: 'start',
          }}
        >
          <Stack sx={{ gap: 1.5, minInlineSize: 0 }}>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25 }}>
              <ToneChip label={next.level} tone="primary" size="small" />
              <Typography variant="body2" color="text.secondary">
                {t('taskLabel')}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ marginInlineStart: 'auto', whiteSpace: 'nowrap' }}
              >
                {t('lessonWordRange', { min: next.minWords, max: next.maxWords })}
              </Typography>
            </Stack>
            <Typography variant="h2" sx={{ textWrap: 'balance' }}>
              {next.lessonTitle}
            </Typography>
            <Typography variant="subtitle1" color="secondary.main">
              {next.unitTitle}
            </Typography>
            <Typography
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                maxInlineSize: '54ch',
              }}
            >
              {next.prompt}
            </Typography>
            <Box>
              <NavigationButton
                href={preview ? '/dev/preview/write' : next.href}
                tone="primary"
                endIcon={<ArrowForward />}
              >
                {t(next.warmupsDone ? 'continueWriting' : 'startLesson')}
              </NavigationButton>
            </Box>
          </Stack>
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, justifyContent: 'center' }}>
            <PaperAccent inlineSize={168} blockSize={150} kind="travel" sx={{ display: 'block' }} />
          </Box>
        </Box>
        <Divider sx={{ my: 2.5 }} />
        <FocusChips focus={next.focus} />
        <TargetRecommendations targets={next.advisoryTargets} />
      </CardContent>
    </Card>
  );
}

function PlacementTaskCard({ preview }: { preview: boolean }) {
  const t = useTranslations('today');
  return (
    <Card data-testid="today-task" sx={{ height: '100%' }}>
      <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
        <Stack sx={{ gap: 2 }}>
          <Typography variant="h2">{t('placementTitle')}</Typography>
          <Typography color="text.secondary">{t('placementBody')}</Typography>
          <NavigationButton
            href={preview ? '/dev/preview/placement' : '/placement'}
            tone="primary"
            endIcon={<ArrowForward />}
            sx={{ alignSelf: 'flex-start' }}
          >
            {t('startPlacement')}
          </NavigationButton>
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
    <PaperLikeReview>
      <Stack direction="row" sx={{ gap: 2, alignItems: 'center' }}>
        <Box
          sx={{
            inlineSize: 48,
            blockSize: 48,
            borderRadius: '50%',
            bgcolor: 'highlighter.main',
            color: 'primary.main',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <ShowChart />
        </Box>
        <Box>
          <Typography variant="subtitle1" component="h2">
            {t(pastTense ? 'reviewTitle' : 'reviewGeneral')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('reviewReady', { n: due })}
          </Typography>
        </Box>
      </Stack>
      <NavigationButton
        href={preview ? '/dev/preview/practice-page' : '/practice'}
        tone="secondary"
        endIcon={<ArrowForward />}
        sx={{ flexShrink: 0, bgcolor: 'background.paper' }}
      >
        {t('due', { n: due })}
      </NavigationButton>
    </PaperLikeReview>
  );
}

function PaperLikeReview({ children }: { children: ReactNode }) {
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
        position: 'relative',
        overflow: 'clip',
        borderRadius: 3,
        py: 1.75,
        px: { xs: 2, sm: 3 },
      }}
    >
      <CalloutRibbon />
      {children}
    </Stack>
  );
}

function IeltsPromoCard({ preview }: { preview: boolean }) {
  const t = useTranslations('today');
  return (
    <Card sx={{ position: 'relative', overflow: 'clip' }}>
      <PaperAccent
        inlineSize={160}
        blockSize={130}
        sx={{ position: 'absolute', insetInlineEnd: -30, insetBlockEnd: -45 }}
      />
      <CardContent sx={{ p: 2.5 }}>
        <Stack sx={{ gap: 1 }}>
          <Stack
            direction="row"
            sx={{ gap: 1, alignItems: 'center', justifyContent: 'space-between' }}
          >
            <SchoolOutlined sx={{ color: 'primary.main' }} />
            <SectionTitle sx={{ flex: 1 }}>{t('ieltsTitle')}</SectionTitle>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {t('ieltsIntro')}
          </Typography>
          <NavigationButton
            tone="secondary"
            endIcon={<ArrowForward />}
            href={preview ? '/dev/preview/path?course=full&track=ielts' : '/path?track=ielts'}
            sx={{ alignSelf: 'flex-start' }}
          >
            {t('ieltsTitle')}
          </NavigationButton>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function Today({
  preview = false,
  signedIn = false,
  track = 'core',
  goal,
  submissions = [],
  progress,
  due = 0,
  weeklyGoal = 5,
  path,
  pastTense = false,
  now,
  next,
  firstSession,
}: {
  preview?: boolean;
  signedIn?: boolean;
  track?: CurriculumTrack;
  goal?: GoalSummary;
  submissions?: SavedSubmission[];
  progress?: ProgressReport;
  next?: NextTask;
  firstSession?: FirstSessionGuideState | null;
  due?: number;
  weeklyGoal?: number;
  path?: LearningSnapshotData;
  pastTense?: boolean;
  now?: string;
}) {
  const t = useTranslations('today');
  const app = useTranslations('app');
  const format = useFormatter();
  const date = new Date(now ?? progress?.asOf ?? new Date().toISOString());
  const account = preview || signedIn;
  return (
    <Container data-testid="today-layout" maxWidth={false} disableGutters>
      <PageHeader
        title={t('title')}
        note={app('paperNotes.today')}
        subtitle={
          <Stack sx={{ gap: 0.75 }}>
            <Typography
              component="p"
              sx={{ color: 'text.primary', fontWeight: 650, fontSize: '0.9375rem' }}
            >
              {format.dateTime(date, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                timeZone: 'UTC',
              })}
            </Typography>
            <Typography component="p">{t('tagline')}</Typography>
          </Stack>
        }
      />
      {account && firstSession ? (
        <Box sx={{ mb: { xs: 2, md: 2.5 } }}>
          <FirstSessionGuide
            step={firstSession.step}
            feedbackId={firstSession.feedbackId}
            preview={preview}
          />
        </Box>
      ) : null}
      {account && goal ? (
        <Box sx={{ mb: { xs: 2, md: 2.5 } }}>
          <GoalCard summary={goal} next={next} preview={preview} />
        </Box>
      ) : null}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1.45fr) minmax(0, 1fr)' },
          gap: { xs: 2, md: 2.5 },
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
                <NavigationButton tone="secondary" href="/dev/preview/today" sx={{ mt: 3 }}>
                  {t('preview')}
                </NavigationButton>
              ) : null}
            </CardContent>
          </Card>
        )}
      </Box>
      {account ? (
        <>
          <Box sx={{ my: { xs: 2, md: 2.5 } }}>
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
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1.18fr) minmax(0, 1fr)' },
              gap: { xs: 2, md: 2.5 },
              alignItems: 'start',
            }}
          >
            <SavedFeedback submissions={submissions} preview={preview} />
            <Stack sx={{ gap: { xs: 2, md: 2.5 } }}>
              <LearningSnapshot path={path} preview={preview} />
              {track === 'ielts' ? null : <IeltsPromoCard preview={preview} />}
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
