'use client';

import { useTranslations } from 'next-intl';
import { memo } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import ReadingPassage from '@/components/curriculum/ReadingPassage';
import IeltsContract from '@/components/curriculum/IeltsContract';
import TaskChart from '@/components/curriculum/TaskChart';
import type { CurriculumTask } from '@/lib/curriculum';
import ToneChip from '@/components/shared/ToneChip';
import SectionTitle from '@/components/shared/SectionTitle';
import { SkeletonMask } from '@/components/shared/ContentSkeleton';

type TaskBriefProps = {
  onInsert: (phrase: string) => void;
  disabled?: boolean;
  task?: CurriculumTask;
  loading?: boolean;
};

export default memo(function TaskBrief({
  onInsert,
  disabled = false,
  task,
  loading = false,
}: TaskBriefProps) {
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
        <SkeletonMask loading={loading}>
          <SectionTitle>{task?.title ?? t('title')}</SectionTitle>
        </SkeletonMask>
        <ToneChip label={task?.targetLevel ?? 'A2'} tone="primary" size="small" />
      </Stack>
      {task ? <IeltsContract taskId={task.id} /> : null}
      <ReadingPassage reading={task?.reading} />
      <SkeletonMask loading={loading}>
        <Typography sx={{ mb: 1 }}>{task?.prompt ?? t('description')}</Typography>
      </SkeletonMask>
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
            control={<Checkbox disabled={disabled} />}
            label={
              <SkeletonMask loading={loading}>
                <Typography variant="body2">{point}</Typography>
              </SkeletonMask>
            }
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
              <ToneChip
                key={phrase}
                label={phrase}
                tone="primary"
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
});
