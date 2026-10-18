'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LoadingBar from '@/components/shared/LoadingBar';

export default function CoachStatus() {
  const live = useTranslations('liveStudio');
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <Stack sx={{ gap: 1.5 }} role="status" aria-live="polite">
      <LoadingBar label={live('checking')} />
      <Typography variant="subtitle1">
        {live(seconds >= 15 ? 'checkingSlow' : 'checking')}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {live('checkingDetail')}
      </Typography>
      <Typography variant="caption" aria-live="off">
        {live('elapsed', { n: seconds })}
      </Typography>
    </Stack>
  );
}
