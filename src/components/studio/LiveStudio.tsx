'use client';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CoachStatus from './CoachStatus';
import CoachHint from './CoachHint';
import { requestCoach, recoverCoach, type CoachResult } from '@/lib/feedback/request';
import WritingCanvas from './WritingCanvas';
import ReadSweep from './ReadSweep';
import TaskBrief from './TaskBrief';
import { countWords } from '@/lib/draft';
import NextLink from 'next/link';
import { useUnsavedWriting } from '@/lib/use-unsaved-writing';
import { weekendTask, type CurriculumTask } from '@/lib/curriculum';
import { textLimits } from '@/lib/limits';

export default function LiveStudio({
  initialText,
  parentSubmissionId,
  attempt = 1,
  preview = false,
  coursePreview = false,
  task = weekendTask,
}: {
  initialText: string;
  parentSubmissionId?: string;
  attempt?: number;
  preview?: boolean;
  coursePreview?: boolean;
  task?: CurriculumTask;
}) {
  const app = useTranslations('app');
  const t = useTranslations('studio');
  const live = useTranslations('liveStudio');
  const router = useRouter();
  const pathname = usePathname();
  const recoveryStorageKey = 'coach-check:' + pathname + (coursePreview ? ':' + task.id : '');
  const courseDraftKey = 'course-draft:' + task.id;
  const [text, setText] = useState(initialText);
  const [savedText, setSavedText] = useState(initialText);
  const [busy, setBusy] = useState<'save' | 'check' | null>(null);
  const [error, setError] = useState<
    | 'saveError'
    | 'error'
    | 'dailyLimit'
    | 'sessionExpired'
    | 'timeout'
    | 'inProgress'
    | 'recoverable'
    | null
  >(null);
  const allowNavigation = useUnsavedWriting(text !== savedText, live('leaveWarning'));
  const input = useRef<HTMLTextAreaElement>(null);
  const checking = useRef(false);
  const requestKey = useRef<string | null>(null);
  const submittedText = useRef<string | null>(null);
  const words = countWords(text);
  const limit = textLimits[task.targetLevel];
  async function save() {
    if (coursePreview || busy || text.length > limit) return;
    setBusy('save');
    setError(null);
    const snapshot = text;
    try {
      const response = await fetch('/api/draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          task.id === 'weekend' ? { text: snapshot } : { text: snapshot, taskId: task.id },
        ),
        signal: AbortSignal.timeout(10000),
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
  function rememberCheck(value: string | null) {
    requestKey.current = value;
    try {
      if (value) sessionStorage.setItem(recoveryStorageKey, value);
      else sessionStorage.removeItem(recoveryStorageKey);
    } catch {
      // Browser storage can be blocked. In-memory recovery remains available.
    }
  }
  function handleCoachResult(result: CoachResult) {
    if (result.status === 'completed') {
      if (
        text !== savedText &&
        text !== submittedText.current &&
        !window.confirm(live('leaveWarning'))
      ) {
        setError('recoverable');
        return;
      }
      rememberCheck(null);
      if (coursePreview) {
        try {
          sessionStorage.setItem(courseDraftKey, submittedText.current ?? text);
        } catch {
          // The synthetic preview can be rewritten when browser storage is blocked.
        }
      }
      allowNavigation();
      router.push(
        preview
          ? coursePreview
            ? '/dev/preview/course-feedback?task=' + task.id
            : '/dev/preview/feedback'
          : '/feedback/' + result.submissionId,
      );
      return;
    }
    if (result.status === 'pending') {
      setError('recoverable');
      return;
    }
    rememberCheck(null);
    const errors: Record<string, 'sessionExpired' | 'dailyLimit' | 'timeout' | 'inProgress'> = {
      UNAUTHENTICATED: 'sessionExpired',
      DAILY_LIMIT: 'dailyLimit',
      COACH_TIMEOUT: 'timeout',
      CHECK_IN_PROGRESS: 'inProgress',
    };
    setError(errors[result.code] ?? 'error');
  }
  async function check(recover = false) {
    if (checking.current) return;
    checking.current = true;
    setBusy('check');
    setError(null);
    try {
      if (!recover) submittedText.current = text;
      rememberCheck(requestKey.current ?? crypto.randomUUID());
      const result = recover
        ? await recoverCoach(
            requestKey.current!,
            coursePreview ? { endpoint: '/dev/preview/course-api' } : {},
          )
        : await requestCoach(
            { taskId: task.id, text, attempt, parentSubmissionId },
            requestKey.current!,
            coursePreview ? { endpoint: '/dev/preview/course-api' } : {},
          );
      handleCoachResult(result);
    } catch {
      setError('recoverable');
    } finally {
      checking.current = false;
      setBusy(null);
    }
  }
  const recoverOnMount = useEffectEvent(() => {
    try {
      if (coursePreview) {
        const draft = sessionStorage.getItem(courseDraftKey);
        if (draft !== null && draft.length <= limit) setText(draft);
        return;
      }
      if (parentSubmissionId) {
        const revisionKey = 'feedback-revision:' + parentSubmissionId;
        const revision = sessionStorage.getItem(revisionKey);
        if (revision !== null && revision.length <= 10000) setText(revision);
      }
      const savedKey = sessionStorage.getItem(recoveryStorageKey);
      if (savedKey && /^[a-f0-9-]{36}$/i.test(savedKey)) {
        requestKey.current = savedKey;
        void check(true);
      }
    } catch {
      // Do not block writing when browser storage is unavailable.
    }
  });
  useEffect(() => {
    const frame = requestAnimationFrame(() => recoverOnMount());
    return () => cancelAnimationFrame(frame);
  }, [recoveryStorageKey]);
  function updateText(value: string) {
    setText(value);
    if (parentSubmissionId) {
      try {
        sessionStorage.setItem('feedback-revision:' + parentSubmissionId, value);
      } catch {
        // The unsaved-writing guard still protects this editor if storage is blocked.
      }
    }
  }
  function insertPhrase(phrase: string) {
    if (busy === 'check') return;
    const start = input.current?.selectionStart ?? text.length;
    const end = input.current?.selectionEnd ?? start;
    const value = text.slice(0, start) + phrase + text.slice(end);
    if (value.length > limit) return;
    updateText(value);
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.setSelectionRange(start + phrase.length, start + phrase.length);
    });
  }
  return (
    <Stack sx={{ gap: 3 }}>
      <Typography variant="h1">{app('write')}</Typography>
      <Box
        sx={(theme) => ({
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            lg: theme.layout.taskRail + 'px minmax(0, 1fr) ' + theme.layout.coachRail + 'px',
          },
          gap: 3,
          alignItems: 'start',
        })}
      >
        <Box sx={{ py: 2 }}>
          <TaskBrief
            onInsert={insertPhrase}
            disabled={busy === 'check'}
            task={task.id === 'weekend' ? undefined : task}
          />
        </Box>
        <Paper variant="outlined" sx={{ minInlineSize: 0, p: { xs: 2, md: 4 } }}>
          <Box sx={{ position: 'relative' }}>
            <WritingCanvas
              inputRef={input}
              maxLength={limit}
              value={text}
              disabled={busy === 'check'}
              onChange={(event) => updateText(event.target.value)}
            />
            {busy === 'check' ? <ReadSweep inputRef={input} text={text} /> : null}
          </Box>
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
                disabled={
                  coursePreview || busy !== null || text === savedText || text.length > limit
                }
                onClick={save}
              >
                {live(busy === 'save' ? 'saving' : 'save')}
              </Button>
              <Button
                variant="contained"
                disabled={
                  busy !== null ||
                  words < task.minWords ||
                  text.length > limit ||
                  error === 'recoverable'
                }
                onClick={() => check()}
              >
                {t('check')}
              </Button>
            </Stack>
            {text.length > limit ? (
              <Alert severity="warning">
                {task.id === 'weekend'
                  ? live('revisionTooLong')
                  : live('taskTooLong', { n: limit })}
              </Alert>
            ) : null}
            {words < task.minWords ? (
              <Typography variant="caption">
                {t('remaining', { n: task.minWords - words })}
              </Typography>
            ) : null}
            {busy === 'check' ? <CoachStatus /> : null}
            {error ? (
              <Alert severity="error">
                {live(error)}
                {error === 'sessionExpired' ? (
                  <Button component={NextLink} href="/login">
                    {live('signInAgain')}
                  </Button>
                ) : error === 'recoverable' ? (
                  <Button disabled={busy !== null} onClick={() => check(true)}>
                    {live('recover')}
                  </Button>
                ) : error === 'error' || error === 'timeout' ? (
                  <Button disabled={busy !== null} onClick={() => check()}>
                    {live('retry')}
                  </Button>
                ) : null}
              </Alert>
            ) : null}
            <Typography variant="caption" color="text.secondary">
              {live('notice')}
            </Typography>
          </Stack>
        </Paper>
        <CoachHint text={text} task={task} />
      </Box>
    </Stack>
  );
}
