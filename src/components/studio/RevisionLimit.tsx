'use client';
import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
export default function RevisionLimit({ taskId }: { taskId: string }) {
  const t = useTranslations('feedback');
  return (
    <Stack sx={{ gap: 2 }}>
      <Alert severity="info">{t('revisionLimit')}</Alert>
      <Button component={NextLink} href={'/write/' + taskId} variant="contained">
        {t('newDraft')}
      </Button>
    </Stack>
  );
}
