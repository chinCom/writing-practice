'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import Divider from '@mui/material/Divider';
import type { HintTask, WritingHint } from '@/lib/writing-hints';

type HintResult = { text: string; taskKey: string; hints: WritingHint[] };

export default function CoachHint({
  text,
  task,
  quickChecks = [],
}: {
  text: string;
  task: HintTask;
  quickChecks?: string[];
}) {
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
    <Box component="aside" role="region" aria-labelledby={titleId}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25, mb: 2 }}>
        <Box
          sx={{
            inlineSize: 36,
            blockSize: 36,
            borderRadius: 1.5,
            bgcolor: 'tonal.primary',
            color: 'secondary.main',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <ChatBubbleOutlineOutlined sx={{ fontSize: 19 }} />
        </Box>
        <Typography component="h2" id={titleId} variant="h3">
          {t('coach')}
        </Typography>
      </Stack>
      <Stack sx={{ gap: 1.5 }} aria-live="polite" aria-atomic="true">
        {!unavailable && current?.hints.length ? (
          current.hints.map((hint, index) => (
            <Paper
              key={index}
              variant="outlined"
              sx={{ p: 1.75, bgcolor: 'background.default', boxShadow: 'none' }}
            >
              <Stack direction="row" sx={{ gap: 1, alignItems: 'flex-start' }}>
                <AutoAwesomeOutlined sx={{ fontSize: 17, color: 'secondary.main', mt: 0.25 }} />
                <Typography variant="body2">{t('helpHints.' + hint.kind, { ...hint })}</Typography>
              </Stack>
            </Paper>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">
            {t(state)}
          </Typography>
        )}
      </Stack>
      {quickChecks.length ? (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1.25 }}>
            {t('quickChecks')}
          </Typography>
          <Stack component="ul" sx={{ m: 0, p: 0, listStyle: 'none', gap: 1 }}>
            {quickChecks.map((check) => (
              <Stack component="li" key={check} direction="row" sx={{ gap: 1.25 }}>
                <CheckCircleOutlined
                  sx={{ fontSize: 18, color: 'secondary.main', mt: 0.25, flexShrink: 0 }}
                />
                <Typography variant="body2">{check}</Typography>
              </Stack>
            ))}
          </Stack>
        </>
      ) : null}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        {t('helpLocal')}
      </Typography>
    </Box>
  );
}
