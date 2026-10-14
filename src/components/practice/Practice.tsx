'use client';
import { useEffect, useRef, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import NextLink from 'next/link';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import WritingField from '@/components/ui/WritingField';
import HintText from '@/components/ui/HintText';
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

export default function Practice({ preview = false }: { preview?: boolean }) {
  const t = useTranslations('practice');
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

  useEffect(() => {
    const controller = new AbortController();
    fetch(endpoint, {
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
      const response = await fetch(endpoint, {
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
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 4 } }}>
      <Stack sx={{ gap: 3 }}>
        <Typography component="h1" variant="h1">
          {t('title')}
        </Typography>
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
            <Stack direction="row" sx={{ alignItems: 'center', gap: 3 }}>
              <Typography variant="body2">
                {t('question', { n: index + 1, total: questions.length })}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(index / questions.length) * 100}
                sx={{ flex: 1 }}
                aria-label={t('progress')}
              />
            </Stack>
            <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 } }}>
              <Stack sx={{ gap: 3 }}>
                <Typography variant="subtitle2" sx={{ color: 'secondary.main' }}>
                  {tags(question.tag)}
                </Typography>
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
                  <Alert role="status" severity={result.correct ? 'success' : 'warning'}>
                    <Typography variant="subtitle1">
                      {t(result.correct ? 'correct' : result.complete ? 'revealed' : 'tryAgain')}
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
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="subtitle1">{t('why')}</Typography>
              <Typography variant="body2">{t('whyBody')}</Typography>
            </Paper>
          </>
        )}
      </Stack>
    </Container>
  );
}
