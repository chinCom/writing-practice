'use client';
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { DevelopmentSchema, developmentFocus, type Development } from '@/lib/feedback/development';
import type { CurriculumTask } from '@/lib/curriculum';
import { textLimits } from '@/lib/limits';

type Result = { snapshot: string; data?: Development; error?: string };
export default function DevelopmentHelp({
  text,
  task,
  disabled = false,
  onPending,
  onFocus,
}: {
  text: string;
  task: CurriculumTask;
  disabled?: boolean;
  onPending?: (pending: boolean) => void;
  onFocus?: (start: number, end: number) => void;
}) {
  const t = useTranslations('development');
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const running = useRef(false);
  const snapshot = task.id + ':' + text.trim();
  const shown = result?.snapshot === snapshot ? result : null;
  const focus = shown?.data ? developmentFocus(text, shown.data.focus_text) : null;
  async function requestHelp() {
    if (
      running.current ||
      disabled ||
      !text.trim() ||
      text.trim().length > textLimits[task.targetLevel]
    )
      return;
    running.current = true;
    setPending(true);
    onPending?.(true);
    setResult(null);
    try {
      const response = await fetch('/api/development', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, text: text.trim() }),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        const errors: Record<number, string> = { 401: 'session', 429: 'limit', 503: 'unavailable' };
        setResult({ snapshot, error: errors[response.status] ?? 'error' });
        return;
      }
      const payload = await response.json();
      const data = DevelopmentSchema.parse(payload.data);
      setResult({ snapshot, data });
    } catch {
      setResult({ snapshot, error: 'error' });
    } finally {
      running.current = false;
      setPending(false);
      onPending?.(false);
    }
  }
  return (
    <Stack component="section" aria-label={t('title')} sx={{ gap: 1.5, marginBlockStart: 3 }}>
      <Typography variant="h3" component="h2">
        {t('title')}
      </Typography>
      <Typography variant="body2">{t('intro')}</Typography>
      <Button
        variant="outlined"
        disabled={
          disabled || pending || !text.trim() || text.trim().length > textLimits[task.targetLevel]
        }
        onClick={requestHelp}
      >
        {t(pending ? 'pending' : 'button')}
      </Button>
      <Typography variant="caption" color="text.secondary">
        {t('notice')}
      </Typography>
      {pending ? (
        <Typography role="status" variant="body2">
          {t('pending')}
        </Typography>
      ) : null}
      {shown?.error ? <Alert severity="warning">{t(shown.error)}</Alert> : null}
      {shown?.data ? (
        shown.data.safety_flag ? (
          <Alert severity="info">{t('safety')}</Alert>
        ) : (
          <Stack sx={{ gap: 1 }} aria-live="polite">
            <Typography>{shown.data.encouragement}</Typography>
            {focus && onFocus ? (
              <Button
                variant="outlined"
                onClick={() => onFocus(focus.start, focus.end)}
                sx={{ textAlign: 'start', overflowWrap: 'anywhere' }}
              >
                {t('showText', { text: shown.data.focus_text })}
              </Button>
            ) : null}
            <Typography sx={{ fontWeight: 'bold' }}>{shown.data.question}</Typography>
            {shown.data.sentence_starter ? (
              <Typography>{shown.data.sentence_starter}</Typography>
            ) : null}
            <Typography>{shown.data.next_step}</Typography>
          </Stack>
        )
      ) : null}
    </Stack>
  );
}
