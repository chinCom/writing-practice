'use client';
import { fetchWithStatus } from '@/lib/network-status';
import { useEffect, useRef, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import WritingField from '@/components/ui/WritingField';
import type { TransferQuestion, gradeTransfer } from '@/lib/transfer';
type Result = ReturnType<typeof gradeTransfer> & { version: number };
export default function Transfer({ preview = false }: { preview?: boolean }) {
  const t = useTranslations('practice');
  const tags = useTranslations('feedback.tags');
  const format = useFormatter();
  const [questions, setQuestions] = useState<TransferQuestion[]>([]);
  const [at, setAt] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState<{
    unitId: string;
    itemId: string;
    answer: string;
    version: number;
  } | null>(null);
  const checking = useRef(false);
  const endpoint = preview ? '/dev/preview/transfer-api' : '/api/transfer';
  useEffect(() => {
    const controller = new AbortController();
    fetchWithStatus(endpoint, {
      cache: 'no-store',
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!data.ok || !Array.isArray(data.questions)) throw new Error();
        if (!controller.signal.aborted) {
          setQuestions(data.questions);
          setAt(data.nextReviewAt);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [endpoint]);
  const question = questions[index];
  async function check() {
    if (!question || checking.current || result?.complete || !answer.trim()) return;
    const body = pending ?? {
      unitId: question.unitId,
      itemId: question.id,
      answer: answer.trim(),
      version: result?.version ?? question.version,
    };
    setPending(body);
    checking.current = true;
    setBusy(true);
    setError(false);
    try {
      const response = await fetchWithStatus(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!data.ok || !data.result) throw new Error();
      setResult(data.result);
      setPending(null);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
      checking.current = false;
    }
  }
  return (
    <Paper
      component="section"
      aria-label={t('transferTitle')}
      variant="outlined"
      sx={{ p: { xs: 3, md: 4 } }}
    >
      <Stack sx={{ gap: 2 }}>
        <Typography component="h2" variant="h2">
          {t('transferTitle')}
        </Typography>
        <Typography variant="body2">{t('transferBody')}</Typography>
        {error && (
          <Alert severity="error">
            {t('loadError')}
            <Button onClick={() => window.location.reload()}>{t('reload')}</Button>
          </Alert>
        )}
        {busy && !question && <Typography role="status">{t('loading')}</Typography>}
        {!busy && !error && !question && (
          <Typography>
            {at
              ? t('nextReview', {
                  date: format.dateTime(new Date(at), { dateStyle: 'medium', timeStyle: 'short' }),
                })
              : t('transferEmpty')}
          </Typography>
        )}
        {question && (
          <>
            <Typography variant="subtitle2">{tags(question.tag)}</Typography>
            <Typography dir="ltr" variant="canvas">
              {question.prompt}
            </Typography>
            <Stack
              component="form"
              sx={{ gap: 2 }}
              onSubmit={(event) => {
                event.preventDefault();
                void check();
              }}
            >
              <WritingField
                label={t('transferAnswer')}
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                disabled={busy || Boolean(pending) || Boolean(result?.complete)}
                slotProps={{ htmlInput: { maxLength: 300 } }}
              />
              <Button
                type="submit"
                variant="contained"
                sx={{ alignSelf: 'start' }}
                disabled={busy || !answer.trim() || Boolean(result?.complete)}
              >
                {t(pending ? 'retry' : 'transferCheck')}
              </Button>
            </Stack>
            {result && (
              <Alert role="status" severity={result.correct ? 'success' : 'warning'}>
                <Stack sx={{ gap: 1 }}>
                  <Typography>
                    {t(result.correct ? 'correct' : result.complete ? 'revealed' : 'tryAgain')}
                  </Typography>
                  {result.complete && (
                    <>
                      <Typography>{result.suggestion}</Typography>
                      <Typography>{result.explanation}</Typography>
                      <Typography>{t('reviewDays', { n: result.days })}</Typography>
                    </>
                  )}
                </Stack>
              </Alert>
            )}
            {result?.complete && (
              <Button
                onClick={() => {
                  setIndex(index + 1);
                  setAnswer('');
                  setResult(null);
                }}
              >
                {t(index + 1 === questions.length ? 'finish' : 'next')}
              </Button>
            )}
          </>
        )}
      </Stack>
    </Paper>
  );
}
