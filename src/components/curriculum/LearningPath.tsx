'use client';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import { ieltsModule, type CurriculumTrack } from '@/lib/curriculum';
import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import type { LearningPath as Path } from '@/lib/db/curriculum';
import PathNode from './PathNode';
import PageHeader from '@/components/ui/PageHeader';
import SegmentedControl from '@/components/ui/SegmentedControl';
export default function LearningPath({
  path,
  preview = false,
  fullCourse = false,
  track = 'core',
}: {
  path: Path;
  preview?: boolean;
  fullCourse?: boolean;
  track?: CurriculumTrack;
}) {
  const t = useTranslations('curriculum');
  const app = useTranslations('app');
  const tags = useTranslations('feedback.tags');
  const base = preview ? '/dev/preview/path?course=full&' : '/path?';
  const groups =
    track === 'ielts' ? (['academic', 'general', 'essay'] as const) : (['core'] as const);
  return (
    <Container maxWidth="lg" disableGutters>
      <Stack sx={{ gap: { xs: 2.5, md: 3 } }}>
        <PageHeader
          title={t('pathTitle')}
          note={app('paperNotes.path')}
          subtitle={t(track === 'ielts' ? 'ieltsIntro' : 'pathIntro')}
        />
        <SegmentedControl
          value={track}
          ariaLabel={t('tracks')}
          options={[
            { value: 'core', label: t('coreTrack'), href: base + 'track=core' },
            { value: 'ielts', label: t('ieltsTrack'), href: base + 'track=ielts' },
          ]}
        />
        {track === 'core' ? (
          <Alert
            severity="info"
            sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}
          >
            {t('courseScope')}
          </Alert>
        ) : null}
        {track === 'core' && !path.chosenLevel ? (
          <Button
            component={NextLink}
            href={preview ? '/dev/preview/placement' : '/placement'}
            variant="contained"
          >
            {t('placementTitle')}
          </Button>
        ) : track === 'core' && path.chosenLevel ? (
          <Chip
            label={t('startingAt', { level: path.chosenLevel })}
            sx={{ alignSelf: 'flex-start' }}
          />
        ) : null}
        {!path.units.length ? <Alert severity="info">{t('contentPending')}</Alert> : null}
        {groups.map((group) => (
          <Stack key={group} sx={{ gap: 3 }}>
            {group !== 'core' ? (
              <Box>
                <Typography component="h2" variant="h2">
                  {t(group)}
                </Typography>
                <Typography color="text.secondary">
                  {t(group === 'essay' ? 'essayRange' : 'taskOneRange')}
                </Typography>
              </Box>
            ) : null}
            {path.units
              .filter((unit) => group === 'core' || ieltsModule(unit.id) === group)
              .map((unit) => (
                <Paper variant="outlined" key={unit.id} sx={{ p: { xs: 2.5, md: 3.5 } }}>
                  <Stack sx={{ gap: 2 }}>
                    <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
                      <Chip
                        label={unit.level}
                        variant="tonal"
                        color="primary"
                        sx={{ fontWeight: 700 }}
                      />
                      <Typography component={track === 'ielts' ? 'h2' : 'h2'} variant="h2">
                        {unit.title}
                      </Typography>
                    </Stack>
                    <Typography>{unit.outcome}</Typography>
                    <Stack direction="row" useFlexGap sx={{ gap: 1, flexWrap: 'wrap' }}>
                      {unit.grammarFocus.map((tag) => (
                        <Chip key={tag} label={tags(tag)} size="small" variant="outlined" />
                      ))}
                    </Stack>
                    <Typography variant="caption">
                      {t('lessonProgress', {
                        done: unit.lessons.filter((lesson) => lesson.state === 'done').length,
                        total: unit.lessons.length,
                      })}
                    </Typography>
                    <LinearProgress
                      aria-label={unit.title}
                      variant="determinate"
                      value={
                        (100 * unit.lessons.filter((lesson) => lesson.state === 'done').length) /
                        unit.lessons.length
                      }
                    />
                    <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                      {unit.lessons.map((lesson, order) => (
                        <PathNode
                          key={lesson.id}
                          title={lesson.title}
                          state={lesson.state as 'done' | 'current' | 'locked' | 'available'}
                          checkpoint={lesson.task.isCheckpoint}
                          last={order === unit.lessons.length - 1}
                          order={order}
                          href={
                            preview
                              ? '/dev/preview/lesson' +
                                (fullCourse ? '?course=full&lesson=' + lesson.id : '')
                              : '/lesson/' + lesson.id
                          }
                          meta={
                            <>
                              {t(lesson.state)} ·{' '}
                              {t(lesson.warmupsDone ? 'practiceDone' : 'practiceNeeded')} ·{' '}
                              {t(lesson.writingDone ? 'writingDone' : 'writingNeeded')}
                              {lesson.task.isCheckpoint ? ' · ' + t('checkpoint') : ''}
                            </>
                          }
                        />
                      ))}
                    </Box>
                  </Stack>
                </Paper>
              ))}
          </Stack>
        ))}
        <Typography variant="body2" color="text.secondary">
          {t(track === 'ielts' ? 'ieltsUnlock' : 'unlockRule')}
        </Typography>
      </Stack>
    </Container>
  );
}
