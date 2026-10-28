'use client';
import { fetchWithStatus } from '@/lib/network-status';
import { useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { ExplanationSchema, type Explanation } from '@/lib/feedback/explanation';
import ActionButton from '@/components/shared/ActionButton';
import LoadingBar from '@/components/shared/LoadingBar';

type State = {
  loading?: boolean;
  data?: Explanation;
  error?: string;
  mock?: boolean;
  expanded?: boolean;
};
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
  const explanationId = useId();
  const [states, setStates] = useState<Record<string, State>>({});
  const busy = useRef(new Set<string>());
  const key = submissionId + ':' + index;
  const state = states[key] ?? {};
  const expanded = Boolean(state.data && state.expanded !== false);
  function update(value: State) {
    setStates((current) => ({ ...current, [key]: value }));
  }
  async function explain() {
    if (busy.current.has(key)) return;
    if (state.data) {
      update({ ...state, expanded: !expanded });
      return;
    }
    busy.current.add(key);
    update({ loading: true });
    const deadline = Date.now() + 22000;
    try {
      while (true) {
        const response = await fetchWithStatus(
          preview ? '/dev/preview/explanation' : '/api/explanation',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ submissionId, correctionIndex: index }),
            signal: AbortSignal.timeout(18000),
          },
        );
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
      <ActionButton
        size="small"
        tone="secondary"
        onClick={explain}
        aria-disabled={Boolean(state.loading)}
        aria-busy={Boolean(state.loading)}
        aria-expanded={expanded}
        aria-controls={explanationId}
      >
        {t(
          expanded
            ? 'hideExplanation'
            : state.loading
              ? 'explaining'
              : state.error
                ? 'explainRetry'
                : 'explain',
        )}
      </ActionButton>
      <Box id={explanationId}>
        {state.loading ? (
          <Box role="status" sx={{ marginBlockStart: 1 }}>
            <Typography variant="caption">{t('explainWaiting')}</Typography>
            <LoadingBar label={t('explaining')} sx={{ marginBlockStart: 0.5 }} />
          </Box>
        ) : null}
        {state.error ? (
          <Alert severity="warning" sx={{ marginBlockStart: 1 }}>
            {t(state.error)}
          </Alert>
        ) : null}
        {state.data && expanded ? (
          <Box
            role="region"
            aria-label={t('explain')}
            tabIndex={0}
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
    </Box>
  );
}
