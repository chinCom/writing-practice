'use client';
import { fetchWithStatus } from '@/lib/network-status';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import WritingField from '@/components/ui/WritingField';
import {
  curriculumLevel,
  placementQuestions,
  type PlacementResult,
  type CurriculumLevel,
} from '@/lib/curriculum';
export default function Placement({
  initialResult = null,
  preview = false,
}: {
  initialResult?: PlacementResult | null;
  preview?: boolean;
}) {
  const t = useTranslations('curriculum');
  const router = useRouter();
  const [samples, setSamples] = useState(['', '']);
  const [answers, setAnswers] = useState(['', '', '']);
  const [result, setResult] = useState(initialResult);
  const [level, setLevel] = useState<CurriculumLevel>(initialResult?.cefr ?? 'A1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endpoint = preview ? '/dev/preview/placement-api' : '/api/placement';
  async function submit(choose = false) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetchWithStatus(endpoint, {
        method: choose ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(choose ? { level } : { samples, answers }),
        signal: AbortSignal.timeout(35000),
      });
      const data = await response.json();
      if (!response.ok || !data.ok)
        throw new Error(
          response.status === 401
            ? 'session'
            : response.status === 429
              ? 'placementLimit'
              : response.status === 409
                ? 'pending'
                : 'requestError',
        );
      if (choose) {
        router.push(preview ? '/dev/preview/path' : '/path');
        return;
      }
      setResult(data.result);
      setLevel(data.result.cefr);
    } catch (failure) {
      setError(
        failure instanceof Error &&
          ['session', 'placementLimit', 'pending'].includes(failure.message)
          ? failure.message
          : 'requestError',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack sx={{ gap: 3 }}>
        <Typography variant="h1" component="h1">
          {t('placementTitle')}
        </Typography>
        <Typography>{t('placementIntro')}</Typography>
        <Alert severity="info">{t('placementLimitNotice')}</Alert>
        {busy ? <LinearProgress aria-label={t('loading')} /> : null}
        {error ? <Alert severity="error">{t(error)}</Alert> : null}
        {result ? (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack sx={{ gap: 2 }}>
              <Typography variant="h2">{t('estimate', { level: result.cefr })}</Typography>
              <Typography>{result.reason}</Typography>
              <Typography variant="body2">
                {t('confidence', { n: Math.round(result.confidence * 100) })}
              </Typography>
              {result.safety_flag ? (
                <Alert severity="warning">{t('safety')}</Alert>
              ) : (
                <>
                  <TextField
                    select
                    label={t('startingLevel')}
                    value={level}
                    disabled={busy}
                    onChange={(event) => setLevel(event.target.value as CurriculumLevel)}
                    slotProps={{ select: { native: true } }}
                  >
                    {curriculumLevel.options.map((value) => (
                      <Box component="option" key={value} value={value}>
                        {value}
                      </Box>
                    ))}
                  </TextField>
                  <Button variant="contained" onClick={() => void submit(true)} disabled={busy}>
                    {t('start')}
                  </Button>
                </>
              )}
            </Stack>
          </Paper>
        ) : (
          <Paper
            component="form"
            variant="outlined"
            sx={{ p: 3 }}
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <Stack sx={{ gap: 3 }}>
              <WritingField
                label={t('aboutYou')}
                helperText={t('aboutPrompt')}
                multiline
                minRows={3}
                value={samples[0]}
                disabled={busy}
                slotProps={{ htmlInput: { minLength: 30, maxLength: 1200 } }}
                onChange={(event) => setSamples([event.target.value, samples[1]])}
              />
              <WritingField
                label={t('recentDay')}
                helperText={t('dayPrompt')}
                multiline
                minRows={3}
                value={samples[1]}
                disabled={busy}
                slotProps={{ htmlInput: { minLength: 30, maxLength: 1200 } }}
                onChange={(event) => setSamples([samples[0], event.target.value])}
              />
              {placementQuestions.map((question, index) => (
                <TextField
                  key={question.prompt}
                  select
                  label={question.prompt}
                  value={answers[index]}
                  disabled={busy}
                  slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
                  onChange={(event) =>
                    setAnswers(
                      answers.map((answer, i) => (i === index ? event.target.value : answer)),
                    )
                  }
                >
                  <Box component="option" value="">
                    {t('choose')}
                  </Box>
                  {question.options.map((value) => (
                    <Box component="option" key={value} value={value}>
                      {value}
                    </Box>
                  ))}
                </TextField>
              ))}
              <Button
                type="submit"
                variant="contained"
                disabled={
                  busy ||
                  samples.some((sample) => sample.trim().length < 30) ||
                  answers.some((answer) => !answer)
                }
              >
                {t('estimateButton')}
              </Button>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Container>
  );
}
