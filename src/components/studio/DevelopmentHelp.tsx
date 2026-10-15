'use client';
import { useTranslations } from 'next-intl';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import type { DevelopmentHelpState } from './useDevelopmentHelp';

// The request control. The question itself appears in the writing, next to the passage.
export default function DevelopmentHelp({ help }: { help: DevelopmentHelpState }) {
  const t = useTranslations('development');
  const { pending, shown, guidance, canRequest, request } = help;
  return (
    <Stack component="section" aria-label={t('title')} sx={{ gap: 1.5, marginBlockStart: 3 }}>
      <Typography variant="h3" component="h2">
        {t('title')}
      </Typography>
      <Typography variant="body2">{t('intro')}</Typography>
      <Button variant="outlined" disabled={!canRequest} onClick={request}>
        {t(pending ? 'pending' : 'button')}
      </Button>
      <Typography variant="caption" color="text.secondary">
        {t('notice')}
      </Typography>
      {pending ? (
        <Typography role="status" variant="body2">
          {t('pending')}
        </Typography>
      ) : null}
      {shown?.error ? <Alert severity="warning">{t(shown.error)}</Alert> : null}
      {shown?.data?.safety_flag ? <Alert severity="info">{t('safety')}</Alert> : null}
      {guidance ? (
        <Stack sx={{ gap: 1 }} aria-live="polite">
          <Typography>{guidance.encouragement}</Typography>
          <Typography>{guidance.next_step}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('inWriting')}
          </Typography>
        </Stack>
      ) : null}
    </Stack>
  );
}
