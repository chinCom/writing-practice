'use client';
import { fetchWithStatus } from '@/lib/network-status';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import { modelWords, type TextSpan } from '@/lib/noticing';

export default function Noticing({
  lessonId,
  text,
  instruction,
  endpoint = '/api/noticing',
}: {
  lessonId: string;
  text: string;
  instruction: string;
  endpoint?: string;
}) {
  const t = useTranslations('curriculum');
  const [selected, setSelected] = useState<TextSpan[]>([]);
  const [result, setResult] = useState<{ correct: boolean; explanation?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const words = modelWords(text);
  async function check() {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const response = await fetchWithStatus(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, selected }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error('request');
      setResult(data);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Paper component="section" aria-label={t('noticingTitle')} variant="outlined" sx={{ p: 3 }}>
      <Stack sx={{ gap: 2 }}>
        <Typography component="h2" variant="h2">
          {t('noticingTitle')}
        </Typography>
        <Typography>{instruction}</Typography>
        <Box dir="ltr" sx={{ lineHeight: 2.5 }}>
          {words.map((word, index) => (
            <Box component="span" key={word.start}>
              {text.slice(index ? words[index - 1].end : 0, word.start)}
              <Button
                size="small"
                variant={selected.some((span) => span.start === word.start) ? 'contained' : 'text'}
                aria-pressed={selected.some((span) => span.start === word.start)}
                disabled={busy || Boolean(result?.correct)}
                sx={{
                  minInlineSize: 44,
                  minBlockSize: 44,
                  textTransform: 'none',
                  font: 'inherit',
                  px: 0.5,
                }}
                onClick={() => {
                  setResult(null);
                  setSelected((previous) =>
                    previous.some((span) => span.start === word.start)
                      ? previous.filter((span) => span.start !== word.start)
                      : previous.length < 6
                        ? [...previous, { start: word.start, end: word.end }]
                        : previous,
                  );
                }}
              >
                {word.text}
              </Button>
            </Box>
          ))}
          {text.slice(words.at(-1)?.end ?? 0)}
        </Box>
        <Button
          variant="outlined"
          disabled={busy || !selected.length || Boolean(result?.correct)}
          onClick={() => void check()}
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('checkSelections')}
        </Button>
        {result ? (
          <Alert role="status" severity={result.correct ? 'success' : 'warning'}>
            {t(result.correct ? 'correct' : 'tryAgain')} {result.explanation}
          </Alert>
        ) : null}
        {error ? <Alert severity="error">{t('requestError')}</Alert> : null}
      </Stack>
    </Paper>
  );
}
