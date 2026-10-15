'use client';

import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import IeltsContract from '@/components/curriculum/IeltsContract';
import TaskChart from '@/components/curriculum/TaskChart';
import type { CurriculumTask } from '@/lib/curriculum';

type TaskBriefProps = {
  onInsert: (phrase: string) => void;
  disabled?: boolean;
  task?: CurriculumTask;
};

export default function TaskBrief({ onInsert, disabled = false, task }: TaskBriefProps) {
  const t = useTranslations('studio');
  const wordBank = task
    ? task.wordBank
    : ['lastWeekend', 'evening', 'wouldLike'].map((key) => t(key));
  return (
    <Box>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 2 }}
      >
        <Typography component="h2" variant="h3">
          {task?.title ?? t('title')}
        </Typography>
        <Chip label={task?.targetLevel ?? 'A2'} variant="tonal" color="primary" size="small" />
      </Stack>
      {task ? <IeltsContract taskId={task.id} /> : null}
      <Typography sx={{ mb: 1 }}>{task?.prompt ?? t('description')}</Typography>
      {task ? <TaskChart taskId={task.id} /> : null}
      <Typography variant="body2" color="text.secondary">
        {task ? t('taskWordRange', { min: task.minWords, max: task.maxWords }) : t('wordRange')}
      </Typography>
      {task?.frames?.map((frame) => (
        <Typography
          key={frame}
          variant="body2"
          dir="ltr"
          sx={{ my: 1, bgcolor: 'highlighter.light', p: 1 }}
        >
          {frame}
        </Typography>
      ))}
      <Divider sx={{ my: 2.5 }} />
      <Typography variant="body2">{t('include')}</Typography>
      <FormGroup>
        {(task?.checklist ?? ['where', 'what', 'invite'].map((key) => t(key))).map((point) => (
          <FormControlLabel
            key={point}
            control={<Checkbox />}
            label={<Typography variant="body2">{point}</Typography>}
          />
        ))}
      </FormGroup>
      {wordBank.length ? (
        <>
          <Divider sx={{ my: 2.5 }} />
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            {t('wordBank')}
          </Typography>
          <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1 }}>
            {wordBank.map((phrase) => (
              <Chip
                key={phrase}
                label={phrase}
                variant="outlined"
                clickable
                disabled={disabled}
                onClick={() => onInsert(phrase)}
                sx={{ minHeight: 44 }}
              />
            ))}
          </Stack>
        </>
      ) : null}
    </Box>
  );
}
