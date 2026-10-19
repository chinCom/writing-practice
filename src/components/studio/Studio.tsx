'use client';
import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Collapse from '@mui/material/Collapse';
import WritingCanvas from './WritingCanvas';
import TaskBrief from './TaskBrief';
import { DevelopmentAction, DevelopmentFeedback } from './DevelopmentHelp';
import DevelopmentSuggestion from './DevelopmentSuggestion';
import ReadSweep from './ReadSweep';
import { useDevelopmentHelp } from './useDevelopmentHelp';
import { countWords, decodeDraft, DRAFT_KEY } from '@/lib/draft';
import { sampleDraft } from '@/mocks/draft.sample';
import { weekendTask } from '@/lib/curriculum';
import PageHeader from '@/components/shared/PageHeader';
import ActionButton from '@/components/shared/ActionButton';

const DRAFT_CHANGE_EVENT = 'preview-draft-change';

function subscribeToDraft(callback: () => void) {
  window.addEventListener(DRAFT_CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(DRAFT_CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

function readSavedDraft() {
  try {
    return decodeDraft(localStorage.getItem(DRAFT_KEY)) ?? sampleDraft;
  } catch {
    return sampleDraft;
  }
}

export default function Studio() {
  const t = useTranslations('studio');
  const app = useTranslations('app');
  const saved = useSyncExternalStore(subscribeToDraft, readSavedDraft, () => sampleDraft);
  const [edited, setEdited] = useState<string | null>(null);
  const text = edited ?? saved;
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
  const [tip, setTip] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const words = countWords(text);
  const help = useDevelopmentHelp(text, weekendTask);

  const saveDraft = useCallback((value: string) => {
    setEdited(value);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, text: value }));
      window.dispatchEvent(new Event(DRAFT_CHANGE_EVENT));
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }, []);

  const insertPhrase = useCallback(
    (phrase: string) => {
      const editor = input.current;
      if (!editor) return;
      const { selectionStart: start, selectionEnd: end, value: draft } = editor;
      const before = draft.slice(0, start);
      const after = draft.slice(end);
      const addition =
        (before && !/\s$/.test(before) ? ' ' : '') +
        phrase +
        (after && !/^\s/.test(after) ? ' ' : '');
      saveDraft(before + addition + after);
      requestAnimationFrame(() => {
        input.current?.focus();
        input.current?.setSelectionRange(start + addition.length, start + addition.length);
      });
    },
    [saveDraft],
  );
  return (
    <Stack sx={{ gap: 3 }}>
      <PageHeader title={app('write')} subtitle={t('subtitle')} note={app('paperNotes.studio')} />
      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 3 }}>
        <Card sx={{ p: { xs: 2.5, md: 3 }, minInlineSize: 0 }}>
          <TaskBrief onInsert={insertPhrase} />
        </Card>
        <Paper
          variant="outlined"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'clip',
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
            <Typography variant="caption" role="status">
              {saveState === 'error'
                ? t('saveError')
                : saveState === 'saved'
                  ? t('saved')
                  : t('local')}
            </Typography>
          </Stack>
          <Box sx={{ p: { xs: 2, md: 3.5 }, display: 'flex', flexDirection: 'column' }}>
            <Box
              sx={{
                position: 'relative',
                isolation: 'isolate',
                paddingBlockEnd: help.guidance ? { xs: 18, md: 20 } : 0,
              }}
            >
              <WritingCanvas
                inputRef={input}
                value={text}
                onChange={(event) => saveDraft(event.target.value)}
                maxLength={20000}
              />
              {help.pending ? <ReadSweep inputRef={input} text={text} /> : null}
              {help.guidance ? (
                <DevelopmentSuggestion
                  inputRef={input}
                  text={text}
                  guidance={help.guidance}
                  onClose={help.dismiss}
                />
              ) : null}
            </Box>
            <Divider sx={{ marginBlockStart: 2.5, marginBlockEnd: 2 }} />
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              sx={{ alignItems: { xs: 'stretch', sm: 'center' }, gap: 2, flexWrap: 'wrap' }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                {t('words', { n: words })}
              </Typography>
              <ActionButton tone="primary" disabled={words < 40} onClick={() => setTip(true)}>
                {t('check')}
              </ActionButton>
              <DevelopmentAction help={help} />
            </Stack>
            <DevelopmentFeedback help={help} />
            {words < 40 ? (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                {t('remaining', { n: 40 - words })}
              </Typography>
            ) : null}
            <Collapse in={tip}>
              <Alert severity="info" sx={{ mt: 2 }}>
                {t('local')}
              </Alert>
            </Collapse>
          </Box>
        </Paper>
      </Box>
    </Stack>
  );
}
