'use client';
import { useRef, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
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
import DevelopmentSuggestion from './DevelopmentSuggestion';
import ReadSweep from './ReadSweep';
import { useDevelopmentHelp } from './useDevelopmentHelp';
import { countWords, decodeDraft, DRAFT_KEY } from '@/lib/draft';
import { sampleDraft } from '@/mocks/draft.sample';
import { weekendTask } from '@/lib/curriculum';
import PageHeader from '@/components/ui/PageHeader';

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
    <Stack sx={{ gap: 3 }}>
      <PageHeader title={app('write')} subtitle={t('subtitle')} note={app('paperNotes.studio')} />
      <Box
        sx={(theme) => ({
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0,1fr)',
            lg: theme.layout.taskRail + 'px minmax(0,1fr) ' + theme.layout.coachRail + 'px',
          },
          gap: { xs: 2.5, lg: 3 },
          alignItems: 'start',
        })}
      >
        <Stack sx={{ gap: 2.5, order: { xs: 2, lg: 1 } }}>
          <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
            <Card sx={{ p: 3 }}>
              <TaskBrief onInsert={insertPhrase} />
            </Card>
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
          <Card sx={{ p: 3, bgcolor: 'highlighter.light', boxShadow: 'none' }}>
            <DevelopmentHelp help={help} />
          </Card>
        </Stack>
        <Paper
          variant="outlined"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'clip',
            order: { xs: 1, lg: 2 },
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
            <Box sx={{ position: 'relative', isolation: 'isolate' }}>
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
              sx={{ alignItems: { xs: 'stretch', sm: 'center' }, gap: 2 }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
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
          </Box>
        </Paper>
        <Card sx={{ p: 3, order: { xs: 3, lg: 3 } }}>
          <CoachHint text={text} task={weekendTask} />
        </Card>
      </Box>
    </Stack>
  );
}
