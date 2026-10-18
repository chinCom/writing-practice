'use client';
import { useTranslations } from 'next-intl';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import NavigationButton from '@/components/shared/NavigationButton';
export default function RevisionLimit({ taskId }: { taskId: string }) {
  const t = useTranslations('feedback');
  return (
    <Stack sx={{ gap: 2 }}>
      <Alert severity="info">{t('revisionLimit')}</Alert>
      <NavigationButton href={'/write/' + taskId} tone="primary">
        {t('newDraft')}
      </NavigationButton>
    </Stack>
  );
}
