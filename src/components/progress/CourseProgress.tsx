'use client';
import { useFormatter, useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import type { CourseProgress } from '@/lib/course-progress';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import ArrowForward from '@mui/icons-material/ArrowForward';
import IconBadge from '@/components/shared/IconBadge';
import NavigationButton from '@/components/shared/NavigationButton';

function LevelRows({ levels }: { levels: CourseProgress['levels'] }) {
  const t = useTranslations('progress');
  return (
    <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap' }}>
      {levels.map((level) => (
        <Typography key={level.level} variant="body2">
          {t('levelCount', level)}
        </Typography>
      ))}
    </Stack>
  );
}

function RecentLessons({ recent }: { recent: CourseProgress['recent'] }) {
  const t = useTranslations('progress');
  const format = useFormatter();
  if (!recent.length) return null;
  return (
    <Stack sx={{ gap: 1 }}>
      <Typography component="h4" variant="subtitle1">
        {t('recentLessons')}
      </Typography>
      <Stack component="ul" sx={{ m: 0, p: 0, listStyle: 'none', gap: 1 }}>
        {recent.slice(0, 3).map((lesson) => (
          <Box
            component="li"
            key={lesson.lessonId}
            sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}
          >
            <Typography variant="body2">{lesson.title}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
              {format.dateTime(new Date(lesson.completedAt), {
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC',
              })}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}

function TrackCard({ data, preview }: { data: CourseProgress; preview: boolean }) {
  const t = useTranslations('progress');
  const current = data.current;
  const href = current
    ? current.warmupsDone
      ? '/write/' + current.taskId
      : '/lesson/' + current.lessonId
    : '/placement';
  const count = t('lessonsDone', { done: data.lessonsDone, total: data.lessonsTotal });
  return (
    <Card>
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack sx={{ gap: 2 }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25 }}>
            <IconBadge tone={data.track === 'core' ? 'purple' : 'green'} size="small">
              {data.track === 'core' ? <MenuBookOutlined /> : <SchoolOutlined />}
            </IconBadge>
            <Box>
              <Typography component="h3" variant="h3">
                {t(data.track === 'core' ? 'coreTrack' : 'ieltsTrack')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {count}
              </Typography>
            </Box>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={(100 * data.lessonsDone) / data.lessonsTotal}
            aria-label={count}
          />
          <LevelRows levels={data.levels} />
          <Typography variant="body2">{t('lessonsThisWeek', { n: data.doneThisWeek })}</Typography>
          {current || (data.track === 'core' && data.lessonsDone === 0) ? (
            <NavigationButton
              href={preview ? '/dev/preview/path' : href}
              tone="secondary"
              endIcon={<ArrowForward />}
              sx={{ alignSelf: 'stretch', justifyContent: 'space-between' }}
            >
              {current ? t('continueLesson', { title: current.lessonTitle }) : t('findLevel')}
            </NavigationButton>
          ) : null}
          <RecentLessons recent={data.recent} />
        </Stack>
      </CardContent>
    </Card>
  );
}

export function CourseProgressPanel({
  course,
  preview = false,
}: {
  course: { core: CourseProgress; ielts: CourseProgress };
  preview?: boolean;
}) {
  const t = useTranslations('progress');
  return (
    <Box component="section" aria-labelledby="course-title">
      <Stack sx={{ gap: 2 }}>
        <Typography id="course-title" variant="h2">
          {t('courseTitle')}
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))',
            gap: 3,
          }}
        >
          {[course.core, course.ielts]
            .filter((track) => track.lessonsTotal > 0)
            .map((track) => (
              <TrackCard key={track.track} data={track} preview={preview} />
            ))}
        </Box>
      </Stack>
    </Box>
  );
}
