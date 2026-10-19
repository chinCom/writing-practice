'use client';

import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import PageHeader from '@/components/shared/PageHeader';
import TaskBrief from './TaskBrief';
import {
  ContentSkeleton,
  SkeletonButton,
  SkeletonPanel,
  SkeletonText,
} from '@/components/shared/ContentSkeleton';

export default function StudioSkeleton() {
  const app = useTranslations('app');
  const t = useTranslations('studio');
  const live = useTranslations('liveStudio');
  return (
    <Stack data-ui="studio-skeleton" sx={{ gap: 3 }}>
      <PageHeader title={app('write')} subtitle={t('subtitle')} note={app('paperNotes.studio')} />
      <SkeletonPanel>
        <TaskBrief loading disabled onInsert={() => undefined} />
      </SkeletonPanel>
      <Paper variant="outlined" sx={{ overflow: 'clip' }}>
        <Box
          sx={{
            paddingInline: { xs: 2.5, md: 3.5 },
            paddingBlock: 1.75,
            borderBlockEnd: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle1">{t('draft')}</Typography>
        </Box>
        <Stack sx={{ p: { xs: 2, md: 3.5 } }}>
          <ContentSkeleton
            data-ui="writing-canvas-skeleton"
            variant="rounded"
            sx={(theme) => ({
              blockSize: {
                xs: theme.layout.writingCanvasMobileHeight,
                md: theme.layout.writingCanvasHeight,
              },
            })}
          />
          <Stack sx={{ gap: 2, marginBlockStart: 2.5 }}>
            <Stack sx={{ gap: 1 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <SkeletonText variant="caption" width={100} />
                <SkeletonText variant="caption" width={120} />
              </Stack>
              <ContentSkeleton variant="rounded" height={4} />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2 }}>
              <SkeletonButton width={130} />
              <SkeletonButton width={190} />
              <Box sx={{ marginInlineStart: { sm: 'auto' } }}>
                <SkeletonButton width={170} />
              </Box>
            </Stack>
            <Typography variant="caption">{t('remaining', { n: 40 })}</Typography>
            <Typography variant="caption" color="text.secondary">
              {live('notice')}
            </Typography>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
