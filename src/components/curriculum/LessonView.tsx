'use client';
import { fetchWithStatus } from '@/lib/network-status';
import { useState } from 'react';
import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import WritingField from '@/components/ui/WritingField';
import { trackForId } from '@/lib/curriculum';
import IeltsContract from './IeltsContract';
import Noticing from './Noticing';
import ReadingPassage from './ReadingPassage';
import TaskChart from './TaskChart';
import TargetRecommendations from './TargetRecommendations';
import type { LearningPath } from '@/lib/db/curriculum';
type Lesson = LearningPath['units'][number]['lessons'][number];
export default function LessonView({
  lesson,
  preview = false,
  fullCourse = false,
}: {
  lesson: Lesson;
  preview?: boolean;
  fullCourse?: boolean;
}) {
  const t = useTranslations('curriculum');
  const [answers, setAnswers] = useState(lesson.answers);
  const [index, setIndex] = useState(
    Math.max(
      0,
      lesson.warmups.findIndex((_, i) => !lesson.answers[String(i)]),
    ),
  );
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ correct: boolean; hint: string | null } | null>(null);
  const warmup = lesson.warmups[index];
  const done = lesson.warmups.every((_, i) => answers[String(i)]);
  async function check() {
    if (busy || done || result?.correct || !answer.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetchWithStatus(
        preview
          ? fullCourse
            ? '/dev/preview/course-api'
            : '/dev/preview/lessons-api'
          : '/api/lessons',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId: lesson.id, index, answer }),
          signal: AbortSignal.timeout(10000),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.ok)
        throw new Error(response.status === 401 ? 'session' : 'requestError');
      setResult({ correct: data.correct, hint: data.hint });
      if (data.correct) setAnswers((previous) => ({ ...previous, [String(index)]: true }));
    } catch (failure) {
      setError(
        failure instanceof Error && failure.message === 'session' ? 'session' : 'requestError',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack sx={{ gap: 3 }}>
        <Button
          component={NextLink}
          href={
            (preview ? '/dev/preview/path' + (fullCourse ? '?course=full&' : '?') : '/path?') +
            'track=' +
            trackForId(lesson.id)
          }
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('backToPath')}
        </Button>
        <Typography component="h1" variant="h1">
          {lesson.title}
        </Typography>
        <TargetRecommendations targets={lesson.advisoryTargets} />
        <IeltsContract taskId={lesson.task.id} />
        <TaskChart taskId={lesson.task.id} />
        <ReadingPassage reading={lesson.task.reading} />
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack sx={{ gap: 2 }}>
            <Typography variant="h2">{t('miniLesson')}</Typography>
            <Typography sx={{ whiteSpace: 'pre-line' }}>{lesson.miniLesson.markdown}</Typography>
            <Typography variant="subtitle1">{t('model')}</Typography>
            <Typography variant="canvas" dir="ltr">
              {lesson.miniLesson.modelText}
            </Typography>
          </Stack>
        </Paper>
        {lesson.noticing ? (
          <Noticing
            lessonId={lesson.id}
            text={lesson.miniLesson.modelText}
            instruction={lesson.noticing.instruction}
            endpoint={preview ? '/dev/preview/noticing-api' : '/api/noticing'}
          />
        ) : null}
        <Paper
          component="form"
          variant="outlined"
          sx={{ p: 3 }}
          onSubmit={(event) => {
            event.preventDefault();
            void check();
          }}
        >
          <Stack sx={{ gap: 2 }}>
            <Typography variant="h2">{t('warmups')}</Typography>
            {error ? <Alert severity="error">{t(error)}</Alert> : null}
            {done ? (
              <>
                <Alert severity="success">{t('warmupsComplete')}</Alert>
                <Button
                  component={NextLink}
                  href={
                    preview
                      ? '/dev/preview/curriculum-write' +
                        (fullCourse ? '?course=full&task=' + lesson.task.id : '')
                      : '/write/' + lesson.task.id
                  }
                  variant="contained"
                >
                  {t('startWriting')}
                </Button>
              </>
            ) : (
              <>
                <Typography variant="body2">
                  {t('warmupCount', { n: index + 1, total: lesson.warmups.length })}
                </Typography>
                <Typography dir="ltr">{warmup.prompt}</Typography>
                {warmup.options ? (
                  <TextField
                    select
                    label={t('answer')}
                    value={answer}
                    disabled={busy || Boolean(result?.correct)}
                    slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
                    onChange={(event) => setAnswer(event.target.value)}
                  >
                    <Box component="option" value="">
                      {t('choose')}
                    </Box>
                    {warmup.options.map((option) => (
                      <Box component="option" key={option} value={option}>
                        {option}
                      </Box>
                    ))}
                  </TextField>
                ) : (
                  <WritingField
                    label={t('answer')}
                    value={answer}
                    disabled={busy || Boolean(result?.correct)}
                    slotProps={{ htmlInput: { maxLength: 300 } }}
                    onChange={(event) => setAnswer(event.target.value)}
                  />
                )}
                {result ? (
                  <Alert role="status" severity={result.correct ? 'success' : 'warning'}>
                    {t(result.correct ? 'correct' : 'tryAgain')}
                    {result.hint ? ' ' + result.hint : ''}
                  </Alert>
                ) : null}
                {result?.correct ? (
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => {
                      setIndex(index + 1);
                      setAnswer('');
                      setResult(null);
                    }}
                  >
                    {t('nextWarmup')}
                  </Button>
                ) : (
                  <Button type="submit" variant="contained" disabled={busy || !answer.trim()}>
                    {t('check')}
                  </Button>
                )}
              </>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
