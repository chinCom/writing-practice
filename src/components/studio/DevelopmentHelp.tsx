'use client';

import { useTranslations } from 'next-intl';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined';
import type { DevelopmentHelpState } from './useDevelopmentHelp';
import ActionButton from '@/components/shared/ActionButton';

/** The footer action: one request button and the long explanation in a tooltip. */
export function DevelopmentAction({ help }: { help: DevelopmentHelpState }) {
  const t = useTranslations('development');
  const { pending, canRequest, request } = help;
  return (
    <Stack direction="row" sx={{ gap: 0.5, alignItems: 'center' }}>
      <ActionButton
        tone="secondary"
        size="small"
        startIcon={<LightbulbOutlined />}
        disabled={!canRequest}
        onClick={request}
      >
        {t(pending ? 'pending' : 'button')}
      </ActionButton>
      <Tooltip
        arrow
        title={
          <Stack sx={{ gap: 0.75, py: 0.5 }}>
            <Typography variant="body2">{t('intro')}</Typography>
            <Typography variant="caption">{t('notice')}</Typography>
          </Stack>
        }
      >
        <IconButton size="small" aria-label={t('title')}>
          <InfoOutlined fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

/** Errors, safety guidance and the coach's next step stay under the editor actions. */
export function DevelopmentFeedback({ help }: { help: DevelopmentHelpState }) {
  const t = useTranslations('development');
  const { shown, guidance } = help;
  if (!shown?.error && !shown?.data?.safety_flag && !guidance) return null;
  return (
    <Box
      component="section"
      aria-label={t('title')}
      aria-live="polite"
      sx={{ display: 'grid', gap: 1 }}
    >
      {shown?.error ? <Alert severity="warning">{t(shown.error)}</Alert> : null}
      {shown?.data?.safety_flag ? <Alert severity="info">{t('safety')}</Alert> : null}
      {guidance ? (
        <Stack sx={{ gap: 0.5 }}>
          <Typography variant="body2">{guidance.encouragement}</Typography>
          <Typography variant="body2">{guidance.next_step}</Typography>
          <Typography variant="caption" color="text.secondary">
            {t('inWriting')}
          </Typography>
        </Stack>
      ) : null}
    </Box>
  );
}
