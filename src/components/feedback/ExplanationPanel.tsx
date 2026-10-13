'use client';
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import { ExplanationSchema, type Explanation } from '@/lib/feedback/explanation';

type State = { loading?: boolean; data?: Explanation; error?: string; mock?: boolean };
export default function ExplanationPanel({
  submissionId,
  index,
  preview,
}: {
  submissionId: string;
  index: number;
  preview: boolean;
}) {
  const t = useTranslations('feedback');
  const [states, setStates] = useState<Record<string, State>>({});
  const busy = useRef(new Set<string>());
  const key = submissionId + ':' + index;
  const state = states[key] ?? {};
  function update(value: State) {
    setStates((current) => ({ ...current, [key]: value }));
  }
  async function explain() {
    if (busy.current.has(key) || state.data) return;
    busy.current.add(key);
    update({ loading: true });
    const deadline = Date.now() + 22000;
    try {
      while (true) {
        const response = await fetch(preview ? '/dev/preview/explanation' : '/api/explanation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submissionId, correctionIndex: index }),
          signal: AbortSignal.timeout(18000),
        });
        const result = await response.json();
        if (response.status === 202 && Date.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
        if (!response.ok || result.pending)
          throw new Error(result.error?.code ?? 'EXPLANATION_TIMEOUT');
        update({ data: ExplanationSchema.parse(result.data), mock: result.mock === true });
        break;
      }
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      update({
        error:
          code === 'UNAUTHENTICATED'
            ? 'explainSession'
            : code === 'EXPLANATION_LIMIT'
              ? 'explainLimit'
              : code === 'EXPLANATION_TIMEOUT' ||
                  (error instanceof Error && error.name === 'TimeoutError')
                ? 'explainTimeout'
                : 'explainError',
      });
    } finally {
      busy.current.delete(key);
    }
  }
  return (
    <Box sx={{ marginBlockStart: 1.5 }}>
      {!state.data ? (
        <Button
          size="small"
          variant="outlined"
          onClick={explain}
          disabled={state.loading}
          aria-expanded={Boolean(state.data)}
        >
          {t(state.loading ? 'explaining' : state.error ? 'explainRetry' : 'explain')}
        </Button>
      ) : null}
      {state.loading ? (
        <Box role="status" sx={{ marginBlockStart: 1 }}>
          <Typography variant="caption">{t('explainWaiting')}</Typography>
          <LinearProgress aria-label={t('explaining')} sx={{ marginBlockStart: 0.5 }} />
        </Box>
      ) : null}
      {state.error ? (
        <Alert severity="warning" sx={{ marginBlockStart: 1 }}>
          {t(state.error)}
        </Alert>
      ) : null}
      {state.data ? (
        <Box
          role="region"
          aria-label={t('explain')}
          sx={{
            marginBlockStart: 1,
            padding: 1.5,
            bgcolor: 'action.hover',
            borderRadius: 1,
            maxBlockSize: '30dvh',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
          }}
        >
          {state.mock ? <Typography variant="caption">{t('mock')}</Typography> : null}
          <Typography variant="subtitle2">{t('whyOriginal')}</Typography>
          <Typography variant="body2" dir="ltr">
            {state.data.why_original}
          </Typography>
          <Typography variant="subtitle2" sx={{ marginBlockStart: 1.5 }}>
            {t('whySuggestion')}
          </Typography>
          <Typography variant="body2" dir="ltr">
            {state.data.why_suggestion}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}
