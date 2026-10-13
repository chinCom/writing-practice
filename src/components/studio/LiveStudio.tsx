'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import WritingField from '@/components/ui/WritingField';
import TaskBrief from './TaskBrief';
import { countWords } from '@/lib/draft';
import NextLink from 'next/link';
import { useUnsavedWriting } from '@/lib/use-unsaved-writing';

export default function LiveStudio({
  initialText,
  parentSubmissionId,
  attempt = 1,
  preview = false,
}: {
  initialText: string;
  parentSubmissionId?: string;
  attempt?: number;
  preview?: boolean;
}) {
  const app = useTranslations('app');
  const t = useTranslations('studio');
  const live = useTranslations('liveStudio');
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [savedText, setSavedText] = useState(initialText);
  const [busy, setBusy] = useState<'save' | 'check' | null>(null);
  const [error, setError] = useState<
    'saveError' | 'error' | 'dailyLimit' | 'sessionExpired' | null
  >(null);
  const allowNavigation = useUnsavedWriting(text !== savedText, live('leaveWarning'));
  const input = useRef<HTMLTextAreaElement>(null);
  const words = countWords(text);
  async function save() {
    setBusy('save');
    setError(null);
    const snapshot = text;
    try {
      const response = await fetch('/api/draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: snapshot }),
      });
      if (response.status === 401) {
        setError('sessionExpired');
        return;
      }
      if (!response.ok) throw new Error('Save failed');
      setSavedText(snapshot);
    } catch {
      setError('saveError');
    } finally {
      setBusy(null);
    }
  }
  async function check() {
    setBusy('check');
    setError(null);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: 'weekend', text, attempt, parentSubmissionId }),
      });
      const result: { ok: boolean; data?: { submissionId: string }; error?: { code: string } } =
        await response.json();
      if (!response.ok || !result.ok || !result.data) {
        setError(
          response.status === 401
            ? 'sessionExpired'
            : result.error?.code === 'DAILY_LIMIT'
              ? 'dailyLimit'
              : 'error',
        );
        return;
      }
      allowNavigation();
      router.push(preview ? '/dev/preview/feedback' : '/feedback/' + result.data.submissionId);
    } catch {
      setError('error');
    } finally {
      setBusy(null);
    }
  }
  function insertPhrase(phrase: string) {
    if (busy === 'check') return;
    const start = input.current?.selectionStart ?? text.length;
    const end = input.current?.selectionEnd ?? start;
    const value = text.slice(0, start) + phrase + text.slice(end);
    if (value.length > 1200) return;
    setText(value);
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.setSelectionRange(start + phrase.length, start + phrase.length);
    });
  }
  return (
    <Stack sx={{ gap: 3 }}>
      <Typography variant="h1">{app('write')}</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'start' }}>
        <Box sx={{ flexBasis: 280, flexGrow: 1, py: 2 }}>
          <TaskBrief onInsert={insertPhrase} disabled={busy === 'check'} />
        </Box>
        <Paper
          variant="outlined"
          sx={{ flexBasis: 0, flexGrow: 999, minInlineSize: 'min(100%, 55%)', p: { xs: 2, md: 4 } }}
        >
          <WritingField
            inputRef={input}
            multiline
            fullWidth
            variant="standard"
            value={text}
            disabled={busy === 'check'}
            onChange={(event) => setText(event.target.value)}
            slotProps={{
              input: {
                disableUnderline: true,
                sx: (theme) => ({
                  ...theme.typography.canvas,
                  minHeight: theme.layout.canvasMinHeight,
                  alignItems: 'start',
                }),
              },
              htmlInput: { 'aria-label': t('writing'), maxLength: 1200 },
            }}
          />
          <Stack sx={{ gap: 2, mt: 3 }}>
            <Typography variant="caption" role="status">
              {live(text === savedText ? 'saved' : 'unsaved')}
            </Typography>
            <Stack direction="row" sx={{ gap: 2, justifyContent: 'space-between' }}>
              <Typography variant="caption">{t('words', { n: words })}</Typography>
              <Typography variant="caption">{live('characters', { n: text.length })}</Typography>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2 }}>
              <Button
                variant="outlined"
                disabled={busy !== null || text === savedText}
                onClick={save}
              >
                {live(busy === 'save' ? 'saving' : 'save')}
              </Button>
              <Button variant="contained" disabled={busy !== null || words < 40} onClick={check}>
                {t('check')}
              </Button>
            </Stack>
            {words < 40 ? (
              <Typography variant="caption">{t('remaining', { n: 40 - words })}</Typography>
            ) : null}
            {busy === 'check' ? (
              <>
                <LinearProgress />
                <Typography role="status">{live('checking')}</Typography>
              </>
            ) : null}
            {error ? (
              <Alert severity="error">
                {live(error)}
                {error === 'sessionExpired' ? (
                  <Button component={NextLink} href="/login">
                    {live('signInAgain')}
                  </Button>
                ) : null}
              </Alert>
            ) : null}
            <Typography variant="caption" color="text.secondary">
              {live('notice')}
            </Typography>
          </Stack>
        </Paper>
      </Box>
    </Stack>
  );
}
