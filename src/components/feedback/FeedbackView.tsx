'use client';
import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Link from '@mui/material/Link';
import type { LocatedFeedback } from '@/lib/feedback/schema';

function MarkedText({ text, feedback }: { text: string; feedback: LocatedFeedback }) {
  const parts = [];
  let cursor = 0;
  const corrections = feedback.corrections
    .map((correction, index) => ({ ...correction, index }))
    .filter((correction) => correction.start !== null && correction.end !== null)
    .sort((a, b) => a.start! - b.start!);
  for (const correction of corrections) {
    const start = correction.start!;
    const end = correction.end!;
    parts.push(text.slice(cursor, start));
    parts.push(
      <Link
        key={start}
        href={'#correction-' + correction.index}
        aria-label={correction.original + ': ' + correction.suggestion}
        onClick={() => document.getElementById('correction-' + correction.index)?.focus()}
        sx={{
          bgcolor: 'highlighter.light',
          color: 'text.primary',
          borderBlockEnd: 2,
          borderColor: 'highlighter.main',
          textDecoration: 'none',
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
          '&:active': { bgcolor: 'highlighter.main' },
        }}
        title={correction.explanation}
      >
        <Box component="mark" sx={{ bgcolor: 'transparent', color: 'inherit' }}>
          {text.slice(start, end)}
        </Box>
      </Link>,
    );
    cursor = end;
  }
  parts.push(text.slice(cursor));
  return (
    <Typography
      component="div"
      dir="ltr"
      sx={(theme) => ({
        ...theme.typography.canvas,
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
      })}
    >
      {parts}
    </Typography>
  );
}
export default function FeedbackView({
  submissionId,
  text,
  feedback,
  mock,
}: {
  submissionId: string;
  text: string;
  feedback: LocatedFeedback;
  mock: boolean;
}) {
  const t = useTranslations('feedback');
  if (feedback.safety_flag)
    return (
      <Stack sx={{ gap: 3 }}>
        <Typography variant="h1">{t('title')}</Typography>
        <Alert severity="warning">{t('safety')}</Alert>
        <Button component={NextLink} href="/today">
          {t('next')}
        </Button>
      </Stack>
    );
  return (
    <Stack sx={{ gap: 3 }}>
      <Typography variant="h1">{t('title')}</Typography>
      {mock ? <Alert severity="info">{t('mock')}</Alert> : null}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h3" sx={{ mb: 1.5 }}>
          {t('strengths')}
        </Typography>
        <Stack sx={{ gap: 1 }}>
          {feedback.strengths.map((strength) => (
            <Typography key={strength}>{strength}</Typography>
          ))}
        </Stack>
      </Paper>
      <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
        {Object.entries(feedback.scores).map(([name, score]) => (
          <Chip key={name} label={t('score', { name: t(name), n: score })} variant="outlined" />
        ))}
      </Stack>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'start' }}>
        <Paper
          variant="outlined"
          sx={{ flexBasis: 0, flexGrow: 999, minInlineSize: 'min(100%, 55%)', p: { xs: 2, md: 4 } }}
        >
          <Typography variant="caption" sx={{ display: 'block', mb: 2 }}>
            {t('original')}
          </Typography>
          <MarkedText text={text} feedback={feedback} />
        </Paper>
        <Stack sx={{ flexBasis: 320, flexGrow: 1, gap: 2 }}>
          <Typography variant="h3">{t('priorities')}</Typography>
          {feedback.priorities.map((priority) => (
            <Typography key={priority.tag}>{priority.why}</Typography>
          ))}
          <Typography variant="h3">{t('notes')}</Typography>
          {feedback.corrections.map((correction, index) => (
            <Paper
              key={index}
              id={'correction-' + index}
              tabIndex={-1}
              variant="outlined"
              sx={(theme) => ({
                p: 2,
                overflowWrap: 'anywhere',
                scrollMarginBlockStart: theme.layout.topBarHeight + theme.spacing(2),
                '&:focus': { outline: '2px solid', outlineColor: 'primary.main' },
              })}
            >
              {correction.start === null ? (
                <Typography variant="caption">{t('unmarked')}</Typography>
              ) : null}
              <Typography
                dir="ltr"
                sx={{
                  textDecoration: 'line-through',
                  color: 'text.secondary',
                  unicodeBidi: 'isolate',
                }}
              >
                {correction.original}
              </Typography>
              <Typography dir="ltr" variant="subtitle1" component="p">
                {t('suggestion', { text: correction.suggestion })}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {correction.explanation}
              </Typography>
            </Paper>
          ))}
        </Stack>
      </Box>
      {feedback.level_up_rewrite ? (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>{t('rewrite')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography dir="ltr">{feedback.level_up_rewrite}</Typography>
          </AccordionDetails>
        </Accordion>
      ) : null}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h3" sx={{ mb: 1 }}>
          {t('next')}
        </Typography>
        <Typography sx={{ mb: 2 }}>{feedback.next_step}</Typography>
        <Button
          variant="contained"
          component={NextLink}
          href={'/write/weekend?revise=' + submissionId}
        >
          {t('revise')}
        </Button>
      </Paper>
    </Stack>
  );
}
