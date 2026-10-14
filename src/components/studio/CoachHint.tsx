'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { HintTask, WritingHint } from '@/lib/writing-hints';

type HintResult = { text: string; taskKey: string; hints: WritingHint[] };

export default function CoachHint({ text, task }: { text: string; task: HintTask }) {
  const t = useTranslations('studio');
  const titleId = useId();
  const worker = useRef<Worker | null>(null);
  const revision = useRef(0);
  const [result, setResult] = useState<HintResult | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const { id, minWords, maxWords, targetLevel } = task;
  const taskKey = [id, minWords, maxWords, targetLevel].join(':');

  useEffect(() => {
    try {
      const background = new Worker(new URL('./writing-hints.worker.ts', import.meta.url));
      worker.current = background;
      function fail() {
        setUnavailable(true);
        worker.current = null;
        background.terminate();
      }
      background.onerror = fail;
      background.onmessageerror = fail;
      return () => {
        worker.current = null;
        background.terminate();
      };
    } catch {
      const timer = setTimeout(() => setUnavailable(true), 0);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const currentRevision = ++revision.current;
    if (!text.trim() || !worker.current) return;
    const background = worker.current;
    let active = true;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    background.onmessage = ({ data }: MessageEvent<{ revision: number; hints: WritingHint[] }>) => {
      if (active && data.revision === revision.current) {
        clearTimeout(deadline);
        setResult({ text, taskKey, hints: data.hints });
      }
    };
    function fail() {
      setUnavailable(true);
      worker.current = null;
      background.terminate();
    }
    const timer = setTimeout(() => {
      try {
        deadline = setTimeout(fail, 3000);
        background.postMessage({
          revision: currentRevision,
          text,
          task: { id, minWords, maxWords, targetLevel },
        });
      } catch {
        clearTimeout(deadline);
        fail();
      }
    }, 500);
    return () => {
      active = false;
      clearTimeout(timer);
      clearTimeout(deadline);
    };
  }, [text, taskKey, id, minWords, maxWords, targetLevel]);

  const current = result?.text === text && result.taskKey === taskKey ? result : null;
  const state = unavailable
    ? 'helpUnavailable'
    : !text.trim()
      ? 'helpStart'
      : !current
        ? 'helpChecking'
        : 'helpClear';
  return (
    <Box component="aside" role="region" aria-labelledby={titleId} sx={{ py: 2 }}>
      <Typography component="h2" id={titleId} variant="h3" sx={{ mb: 2.5 }}>
        {t('coach')}
      </Typography>
      <Stack sx={{ gap: 2 }} aria-live="polite" aria-atomic="true">
        {!unavailable && current?.hints.length ? (
          current.hints.map((hint, index) => (
            <Typography key={index} variant="body2">
              {t('helpHints.' + hint.kind, { ...hint })}
            </Typography>
          ))
        ) : (
          <Typography variant="body2">{t(state)}</Typography>
        )}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        {t('helpLocal')}
      </Typography>
    </Box>
  );
}
