'use client';
import { useRef, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Alert from '@mui/material/Alert';
import Collapse from '@mui/material/Collapse';
import WritingCanvas from './WritingCanvas';
import TaskBrief from './TaskBrief';
import CoachHint from './CoachHint';
import DevelopmentHelp from './DevelopmentHelp';
import { countWords, decodeDraft, DRAFT_KEY } from '@/lib/draft';
import { sampleDraft } from '@/mocks/draft.sample';
import { weekendTask } from '@/lib/curriculum';

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

  function saveDraft(value: string) {
    setEdited(value);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, text: value }));
      window.dispatchEvent(new Event(DRAFT_CHANGE_EVENT));
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }

  function insertPhrase(phrase: string) {
    const start = input.current?.selectionStart ?? text.length;
    const end = input.current?.selectionEnd ?? start;
    const before = text.slice(0, start);
    const after = text.slice(end);
    const addition =
      (before && !/\s$/.test(before) ? ' ' : '') +
      phrase +
      (after && !/^\s/.test(after) ? ' ' : '');
    saveDraft(before + addition + after);
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.setSelectionRange(start + addition.length, start + addition.length);
    });
  }
  return (
    <Box
      sx={(theme) => ({
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(0,1fr)',
          lg: theme.layout.taskRail + 'px minmax(0,1fr) ' + theme.layout.coachRail + 'px',
        },
        gap: 3,
        alignItems: 'start',
      })}
    >
      <Typography variant="h1" sx={{ gridColumn: '1 / -1' }}>
        {app('write')}
      </Typography>
      <Box sx={{ display: { xs: 'none', lg: 'block' }, py: 2 }}>
        <TaskBrief onInsert={insertPhrase} />
      </Box>
      <Box sx={{ display: { lg: 'none' } }}>
        <Accordion disableGutters elevation={0} defaultExpanded slots={{ heading: 'h2' }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography component="span" variant="h3">
              {t('title')}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TaskBrief onInsert={insertPhrase} />
          </AccordionDetails>
        </Accordion>
      </Box>
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, md: 4 },
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <WritingCanvas
          inputRef={input}
          value={text}
          onChange={(event) => saveDraft(event.target.value)}
          maxLength={20000}
        />
        <Divider sx={{ marginBlockStart: 3, marginBlockEnd: 2 }} />
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{ alignItems: { xs: 'stretch', sm: 'center' }, gap: 2 }}
        >
          <Typography variant="caption" role="status" sx={{ flex: 1 }}>
            {saveState === 'error'
              ? t('saveError')
              : saveState === 'saved'
                ? t('saved')
                : t('local')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('words', { n: words })}
          </Typography>
          <Button variant="contained" disabled={words < 40} onClick={() => setTip(true)}>
            {t('check')}
          </Button>
        </Stack>
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
        <DevelopmentHelp text={text} task={weekendTask} />
      </Paper>
      <CoachHint text={text} task={weekendTask} />
    </Box>
  );
}
