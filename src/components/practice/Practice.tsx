'use client';
import { fetchWithStatus } from '@/lib/network-status';
import { useEffect, useRef, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import NextLink from 'next/link';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Collapse from '@mui/material/Collapse';
import LinearProgress from '@mui/material/LinearProgress';
import useMediaQuery from '@mui/material/useMediaQuery';
import CheckCircle from '@mui/icons-material/CheckCircle';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined';
import TaskAltOutlined from '@mui/icons-material/TaskAltOutlined';
import PageHeader from '@/components/ui/PageHeader';
import BoardIcon from '@/components/ui/icons/BoardIcon';
import PaperAccent from '@/components/ui/icons/PaperAccent';
import CalloutRibbon from '@/components/ui/icons/CalloutRibbon';
import WritingField from '@/components/ui/WritingField';
import HintText from '@/components/ui/HintText';
import Transfer from './Transfer';
import { tickPop } from '@/theme/theme';
import type { PracticeAnswer, PracticeQuestion } from '@/lib/practice';

function PracticeHint({ result }: { result: PracticeAnswer }) {
  const t = useTranslations('practice');
  if (result.complete) return <HintText text={result.explanation} terms={result.hintTerms} />;
  const hint = result.retryHint;
  if (hint?.kind === 'modal-word')
    return (
      <HintText
        text={t('retryModal', {
          modal: hint.modal,
          phrase: hint.phrase,
          replacement: hint.replacement,
        })}
        terms={[hint.modal, hint.phrase, hint.replacement]}
      />
    );
  if (hint?.kind === 'phrase')
    return <HintText text={t('retryPhrase', { phrase: hint.phrase })} terms={[hint.phrase]} />;
  return <HintText text={t('retryGeneric')} terms={[]} />;
}

// One segment per question: finished and current segments use the secondary color, later ones stay outlined.
function PracticeSteps({ index, total, label }: { index: number; total: number; label: string }) {
  return (
    <Stack
      direction="row"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={index}
      sx={{ flex: 1, gap: 0.75 }}
    >
      {Array.from({ length: total }, (_, step) => (
        <Box
          key={step}
          sx={(theme) => ({
            flex: 1,
            blockSize: 10,
            borderRadius: 999,
            border: 2,
            borderColor: step <= index ? 'secondary.main' : 'divider',
            bgcolor: step < index ? 'secondary.main' : 'transparent',
            transition: theme.transitions.create(['background-color', 'border-color']),
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          })}
        />
      ))}
    </Stack>
  );
}

export default function Practice({ preview = false }: { preview?: boolean }) {
  const t = useTranslations('practice');
  const app = useTranslations('app');
  const tags = useTranslations('feedback.tags');
  const format = useFormatter();
  const endpoint = preview ? '/dev/preview/practice' : '/api/practice';
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [nextReviewAt, setNextReviewAt] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<PracticeAnswer | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<'loadError' | 'saveError' | 'session' | 'conflict' | null>(
    null,
  );
  const [reload, setReload] = useState(0);
  const [finishedBatch, setFinishedBatch] = useState(false);
  const [pending, setPending] = useState<{
    drillId: string;
    answer: string;
    version: number;
  } | null>(null);
  const checking = useRef(false);
  const answerInput = useRef<HTMLInputElement>(null);
  const question = questions[index];
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const card = useRef<HTMLDivElement>(null);
  // Fade the same card for each question. Remounting it would drop focus from the answer field.
  useEffect(() => {
    if (!reducedMotion && index > 0)
      card.current?.animate({ opacity: [0, 1] }, { duration: 150, easing: 'ease-out' });
  }, [index, reducedMotion]);

  useEffect(() => {
    const controller = new AbortController();
    fetchWithStatus(endpoint, {
      cache: 'no-store',
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
    })
      .then(async (response) => {
        if (response.status === 401) throw new Error('session');
        if (!response.ok) throw new Error('loadError');
        const data = await response.json();
        if (!data.ok || !Array.isArray(data.questions)) throw new Error('loadError');
        if (controller.signal.aborted) return;
        setQuestions(data.questions);
        setNextReviewAt(data.nextReviewAt);
        setIndex(0);
        setResult(null);
        setPending(null);
        setAnswer('');
        setError(null);
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(failure.message === 'session' ? 'session' : 'loadError');
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [endpoint, reload]);

  async function check() {
    if (!question || checking.current || result?.complete || !answer.trim()) return;
    const body = pending ?? {
      drillId: question.id,
      answer: answer.trim(),
      version: result?.version ?? question.version,
    };
    checking.current = true;
    setPending(body);
    setBusy(true);
    setError(null);
    try {
      const response = await fetchWithStatus(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });
      if (response.status === 401) throw new Error('session');
      if (response.status === 409 || response.status === 404) throw new Error('conflict');
      if (!response.ok) throw new Error('saveError');
      const data = await response.json();
      if (!data.ok || !data.result) throw new Error('saveError');
      setResult(data.result);
      setPending(null);
      if (!data.result.complete) requestAnimationFrame(() => answerInput.current?.focus());
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : '';
      setError(
        message === 'session' ? 'session' : message === 'conflict' ? 'conflict' : 'saveError',
      );
    } finally {
      checking.current = false;
      setBusy(false);
    }
  }
  function next() {
    if (index + 1 === questions.length) {
      setFinishedBatch(true);
      refresh();
      return;
    }
    setIndex(index + 1);
    setAnswer('');
    setResult(null);
    requestAnimationFrame(() => answerInput.current?.focus());
  }
  function refresh() {
    setBusy(true);
    setReload(reload + 1);
  }

  return (
    <Container maxWidth={false} disableGutters>
      <Stack sx={{ gap: 3 }}>
        <PageHeader title={t('title')} subtitle={t('subtitle')} note={app('paperNotes.practice')} />
        {busy && <LinearProgress aria-label={t('loading')} />}
        {error && (
          <Alert severity="error">
            {t(error)}
            {error === 'session' ? (
              <Button component={NextLink} href="/login">
                {t('signIn')}
              </Button>
            ) : error === 'loadError' || error === 'conflict' ? (
              <Button onClick={refresh}>{t('reload')}</Button>
            ) : null}
          </Alert>
        )}
        {!busy && !error && !question && (
          <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 } }}>
            <Stack sx={{ gap: 2 }}>
              {finishedBatch ? (
                <CheckCircle
                  aria-hidden="true"
                  sx={{
                    color: 'success.main',
                    fontSize: '3rem',
                    '@media (prefers-reduced-motion: no-preference)': {
                      animation: `${tickPop} 300ms cubic-bezier(0.22, 0.7, 0.2, 1) backwards`,
                    },
                  }}
                />
              ) : null}
              <Typography component="h2" variant="h2">
                {t(finishedBatch ? 'complete' : 'empty')}
              </Typography>
              <Typography>{t(finishedBatch ? 'completeBody' : 'emptyBody')}</Typography>
              {nextReviewAt && (
                <Typography variant="body2">
                  {t('nextReview', {
                    date: format.dateTime(new Date(nextReviewAt), {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }),
                  })}
                </Typography>
              )}
              <Button
                component={NextLink}
                href="/write/weekend"
                variant="contained"
                sx={{ alignSelf: 'flex-start' }}
              >
                {t('write')}
              </Button>
            </Stack>
          </Paper>
        )}
        {question && (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) 320px' },
                gap: 3,
                alignItems: 'start',
              }}
            >
              <Stack ref={card} sx={{ gap: 2.5, minInlineSize: 0 }}>
                <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 } }}>
                  <Stack direction="row" sx={{ alignItems: 'center', gap: 3 }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                      {t('question', { n: index + 1, total: questions.length })}
                    </Typography>
                    <PracticeSteps index={index} total={questions.length} label={t('progress')} />
                  </Stack>
                </Paper>
                <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3.5 } }}>
                  <Stack sx={{ gap: 3 }}>
                    <Chip
                      label={tags(question.tag)}
                      icon={<TaskAltOutlined />}
                      variant="tonal"
                      color="primary"
                      sx={{ alignSelf: 'flex-start', height: 34 }}
                    />
                    <Typography variant="body2">{t('instruction')}</Typography>
                    <Typography component="p" variant="canvas" dir="ltr">
                      {question.text.slice(0, question.start)}
                      <Box
                        component="mark"
                        sx={{
                          bgcolor: 'highlighter.light',
                          color: 'ink.main',
                          textDecoration: 'underline wavy',
                          textDecorationColor: 'secondary.main',
                        }}
                      >
                        {question.original}
                      </Box>
                      {question.text.slice(question.end)}
                    </Typography>
                    <Box
                      component="form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void check();
                      }}
                    >
                      <Stack sx={{ gap: 2 }}>
                        <WritingField
                          fullWidth
                          label={t('answer')}
                          value={answer}
                          inputRef={answerInput}
                          disabled={busy || Boolean(pending) || Boolean(result?.complete)}
                          slotProps={{ htmlInput: { maxLength: 300 } }}
                          onChange={(event) => setAnswer(event.target.value)}
                        />
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={busy || !answer.trim() || Boolean(result?.complete)}
                          sx={{ alignSelf: 'flex-start' }}
                        >
                          {t(busy ? 'saving' : pending ? 'retry' : 'check')}
                        </Button>
                      </Stack>
                    </Box>
                    {result && !pending && (
                      <Collapse in appear timeout={reducedMotion ? 0 : 200}>
                        <Alert role="status" severity={result.correct ? 'success' : 'warning'}>
                          <Typography variant="subtitle1">
                            {t(
                              result.correct
                                ? 'correct'
                                : result.complete
                                  ? 'revealed'
                                  : 'tryAgain',
                            )}
                          </Typography>
                          <Typography variant="body2">
                            <PracticeHint result={result} />
                          </Typography>
                          {result.suggestion && (
                            <Typography variant="body1" dir="ltr" sx={{ mt: 1, fontWeight: 700 }}>
                              <HintText text={result.suggestion} terms={[result.suggestion]} />
                            </Typography>
                          )}
                        </Alert>
                      </Collapse>
                    )}
                    {result?.complete && (
                      <Stack sx={{ gap: 2, alignItems: 'flex-end' }}>
                        <Typography
                          variant="body2"
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <CalendarMonthOutlined fontSize="small" />
                          {t('reviewDays', { n: result.days })}
                        </Typography>
                        <Button variant="outlined" onClick={next}>
                          {t(index + 1 === questions.length ? 'finish' : 'next')}
                        </Button>
                      </Stack>
                    )}
                  </Stack>
                </Paper>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    bgcolor: 'highlighter.light',
                    borderColor: 'highlighter.main',
                    position: 'relative',
                    overflow: 'clip',
                    paddingInlineEnd: { md: 19 },
                  }}
                >
                  <CalloutRibbon />
                  <PaperAccent
                    kind="stack"
                    inlineSize={140}
                    blockSize={125}
                    sx={{ position: 'absolute', insetInlineEnd: 0, insetBlockEnd: -15 }}
                  />
                  <Stack direction="row" sx={{ gap: 2, alignItems: 'center' }}>
                    <Box
                      sx={{
                        inlineSize: 44,
                        blockSize: 44,
                        borderRadius: '50%',
                        bgcolor: 'highlighter.main',
                        color: 'primary.main',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <CalendarMonthOutlined />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1">{t('why')}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('whyBody')}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Stack>
              <Stack sx={{ gap: 2 }}>
                <Card sx={{ p: { xs: 2.5, md: 3 } }}>
                  <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25, mb: 2 }}>
                    <Box
                      sx={{
                        inlineSize: 36,
                        blockSize: 36,
                        borderRadius: '50%',
                        bgcolor: 'highlighter.main',
                        color: 'primary.main',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <LightbulbOutlined sx={{ fontSize: 19 }} />
                    </Box>
                    <Typography variant="h3" component="h2">
                      {t('helpTitle')}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {t('helpIntro')}
                  </Typography>
                </Card>
                <Card
                  sx={{
                    p: { xs: 2.5, md: 3 },
                    gridColumn: { lg: 2 },
                    marginBlockStart: { lg: -2 },
                  }}
                >
                  <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', mb: 2 }}>
                    <BoardIcon name="list" sx={{ color: 'secondary.main' }} />
                    <Typography variant="h3" component="h2">
                      {t('quickChecks')}
                    </Typography>
                  </Stack>
                  <Stack component="ul" sx={{ m: 0, p: 0, listStyle: 'none', gap: 2 }}>
                    {[t('checkForm'), t('checkFit'), t('checkMeaning')].map((check, index) => (
                      <Stack component="li" key={check} direction="row" sx={{ gap: 1.25 }}>
                        <BoardIcon
                          name={(['checkCircle', 'list', 'people'] as const)[index]}
                          sx={{ fontSize: 22, color: 'secondary.main', mt: 0.25 }}
                        />
                        <Typography variant="body2">{check}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Card>
              </Stack>
            </Box>
          </>
        )}
        <Transfer preview={preview} />
      </Stack>
    </Container>
  );
}
