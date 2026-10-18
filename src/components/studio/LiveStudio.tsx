'use client';
import { fetchWithStatus } from '@/lib/network-status';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import CoachStatus from './CoachStatus';
import { DevelopmentAction, DevelopmentFeedback } from './DevelopmentHelp';
import DevelopmentSuggestion from './DevelopmentSuggestion';
import { useDevelopmentHelp } from './useDevelopmentHelp';
import { useWritingCheck } from './useWritingCheck';
import WritingCanvas from './WritingCanvas';
import ReadSweep from './ReadSweep';
import TaskBrief from './TaskBrief';
import { SaveStatus, WordMeter } from './WritingStatus';
import { countWords } from '@/lib/draft';
import { useUnsavedWriting } from '@/lib/use-unsaved-writing';
import { weekendTask, type CurriculumTask } from '@/lib/curriculum';
import { textLimits } from '@/lib/limits';
import PageHeader from '@/components/shared/PageHeader';
import NavigationButton from '@/components/shared/NavigationButton';
import ActionButton from '@/components/shared/ActionButton';

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
  const courseDraftKey = 'course-draft:' + task.id;
  const [text, setText] = useState(initialText);
  const [savedText, setSavedText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<'saveError' | 'sessionExpired' | null>(null);
  const allowNavigation = useUnsavedWriting(text !== savedText, live('leaveWarning'));
  const coach = useWritingCheck({
    input: { taskId: task.id, text, attempt, parentSubmissionId },
    savedText,
    preview,
    coursePreview,
    allowNavigation,
  });
  const { recoveryStorageKey } = coach;
  const busy = coach.pending ? 'check' : saving ? 'save' : null;
  const error = saveError ?? coach.error;
  const input = useRef<HTMLTextAreaElement>(null);
  const words = countWords(text);
  const limit = textLimits[task.targetLevel];
  const help = useDevelopmentHelp(text, task, busy === 'check');
  const developing = help.pending;
  async function save() {
    if (coursePreview || busy || text.length > limit) return;
    setSaving(true);
    setSaveError(null);
    coach.clearError();
    const snapshot = text;
    try {
      const response = await fetchWithStatus('/api/draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          task.id === 'weekend' ? { text: snapshot } : { text: snapshot, taskId: task.id },
        ),
        signal: AbortSignal.timeout(10000),
      });
      if (response.status === 401) {
        setSaveError('sessionExpired');
        return;
      }
      if (!response.ok) throw new Error('Save failed');
      setSavedText(snapshot);
    } catch {
      setSaveError('saveError');
    } finally {
      setSaving(false);
    }
  }
  async function check(recover = false) {
    if (coach.pending || developing) return;
    setSaveError(null);
    await coach.check(recover);
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
      if (!developing) coach.restore();
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
      <PageHeader title={app('write')} subtitle={t('subtitle')} note={app('paperNotes.studio')} />
      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 3 }}>
        <Stack sx={{ gap: 2.5, minInlineSize: 0 }}>
          <Card sx={{ p: { xs: 2.5, md: 3 } }}>
            <TaskBrief
              onInsert={insertPhrase}
              disabled={busy === 'check'}
              task={task.id === 'weekend' ? undefined : task}
            />
          </Card>
        </Stack>
        <Paper
          variant="outlined"
          sx={{
            minInlineSize: 0,
            overflow: 'clip',
            boxShadow: (theme) => theme.shadows[1],
          }}
        >
          <Stack
            direction="row"
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              px: { xs: 2.5, md: 3.5 },
              py: 1.75,
              borderBlockEnd: 1,
              borderColor: 'divider',
            }}
          >
            <Typography variant="subtitle1" component="h2">
              {t('draft')}
            </Typography>
            <SaveStatus
              saved={text === savedText}
              label={live(text === savedText ? 'saved' : 'unsaved')}
            />
          </Stack>
          <Box sx={{ p: { xs: 2, md: 3.5 } }}>
            <Box
              sx={{
                position: 'relative',
                isolation: 'isolate',
                paddingBlockEnd: help.guidance && busy !== 'check' ? { xs: 18, md: 20 } : 0,
              }}
            >
              <WritingCanvas
                inputRef={input}
                maxLength={limit}
                value={text}
                disabled={busy === 'check'}
                onChange={(event) => updateText(event.target.value)}
              />
              {busy === 'check' || developing ? <ReadSweep inputRef={input} text={text} /> : null}
              {help.guidance && busy !== 'check' ? (
                <DevelopmentSuggestion
                  inputRef={input}
                  text={text}
                  guidance={help.guidance}
                  onClose={help.dismiss}
                />
              ) : null}
            </Box>
            <Stack sx={{ gap: 2, mt: 2.5 }}>
              <Stack sx={{ gap: 1 }}>
                <Stack direction="row" sx={{ gap: 2, justifyContent: 'space-between' }}>
                  <Typography variant="caption">{t('words', { n: words })}</Typography>
                  <Typography variant="caption">
                    {live('characters', { n: text.length })}
                  </Typography>
                </Stack>
                <WordMeter words={words} min={task.minWords} max={task.maxWords} />
              </Stack>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                sx={{ gap: 2, flexWrap: 'wrap', alignItems: { sm: 'center' } }}
              >
                <ActionButton
                  tone="secondary"
                  disabled={
                    coursePreview || busy !== null || text === savedText || text.length > limit
                  }
                  onClick={save}
                >
                  {live(busy === 'save' ? 'saving' : 'save')}
                </ActionButton>
                <ActionButton
                  tone="primary"
                  loading={busy === 'check'}
                  loadingPosition="start"
                  disabled={
                    busy !== null ||
                    developing ||
                    words < task.minWords ||
                    text.length > limit ||
                    error === 'recoverable'
                  }
                  onClick={() => check()}
                >
                  {t('check')}
                </ActionButton>
                <Box sx={{ marginInlineStart: { sm: 'auto' } }}>
                  <DevelopmentAction help={help} />
                </Box>
              </Stack>
              <DevelopmentFeedback help={help} />
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
                    <NavigationButton href="/login">{live('signInAgain')}</NavigationButton>
                  ) : error === 'recoverable' ? (
                    <ActionButton tone="quiet" disabled={busy !== null} onClick={() => check(true)}>
                      {live('recover')}
                    </ActionButton>
                  ) : error === 'error' ||
                    error === 'timeout' ||
                    error === 'unavailable' ||
                    error === 'invalidFeedback' ||
                    error === 'failedCheck' ? (
                    <ActionButton tone="quiet" disabled={busy !== null} onClick={() => check()}>
                      {live('retry')}
                    </ActionButton>
                  ) : null}
                </Alert>
              ) : null}
              <Typography variant="caption" color="text.secondary">
                {live('notice')}
              </Typography>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </Stack>
  );
}
