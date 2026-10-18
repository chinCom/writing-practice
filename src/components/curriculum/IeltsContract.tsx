'use client';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { ieltsModule } from '@/lib/curriculum';
import ToneChip from '@/components/shared/ToneChip';

export default function IeltsContract({ taskId }: { taskId: string }) {
  const taskModule = ieltsModule(taskId);
  const t = useTranslations('curriculum');
  if (!taskModule) return null;
  return (
    <Stack sx={{ gap: 1, my: 2 }}>
      <ToneChip label={t(taskModule)} tone="primary" sx={{ alignSelf: 'flex-start' }} />
      <Typography variant="body2">
        {t(taskModule === 'essay' ? 'essayContract' : 'taskOneContract')}
      </Typography>
    </Stack>
  );
}
