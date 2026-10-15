'use client';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { ieltsModule } from '@/lib/curriculum';

export default function IeltsContract({ taskId }: { taskId: string }) {
  const taskModule = ieltsModule(taskId);
  const t = useTranslations('curriculum');
  if (!taskModule) return null;
  return (
    <Stack sx={{ gap: 1, my: 2 }}>
      <Chip
        label={t(taskModule)}
        color="primary"
        variant="tonal"
        sx={{ alignSelf: 'flex-start' }}
      />
      <Typography variant="body2">
        {t(taskModule === 'essay' ? 'essayContract' : 'taskOneContract')}
      </Typography>
    </Stack>
  );
}
