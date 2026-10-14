'use client';
import { useEffect, useRef, useState } from 'react';
import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { preferencesResult, type WeeklyGoal as Goal } from '@/lib/preferences';

export default function WeeklyGoal({
  initialGoal = 5,
  signedIn = false,
  preview = false,
}: {
  initialGoal?: Goal;
  signedIn?: boolean;
  preview?: boolean;
}) {
  const t = useTranslations('settings');
  const [goal, setGoal] = useState<Goal>(initialGoal);
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'saving' | 'saved' | 'error' | 'expired'
  >(preview ? 'loading' : 'idle');
  const pending = useRef<Goal>(initialGoal);
  useEffect(() => {
    if (!preview) return;
    const controller = new AbortController();
    fetch('/api/preferences', {
      cache: 'no-store',
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
    })
      .then(async (response) => {
        if (response.status === 401) {
          setStatus('expired');
          return;
        }
        if (!response.ok) throw new Error('LOAD_FAILED');
        const result = preferencesResult.parse(await response.json());
        if (controller.signal.aborted) return;
        pending.current = result.weeklyGoal;
        setGoal(result.weeklyGoal);
        setStatus('idle');
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('error');
      });
    return () => controller.abort();
  }, [preview]);
  async function save(value: Goal) {
    pending.current = value;
    setStatus('saving');
    try {
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeklyGoal: value }),
        signal: AbortSignal.timeout(10000),
      });
      if (response.status === 401) {
        setStatus('expired');
        return;
      }
      if (!response.ok) throw new Error('SAVE_FAILED');
      const result = preferencesResult.parse(await response.json());
      setGoal(result.weeklyGoal);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }
  return (
    <Stack sx={{ flex: 1, gap: 1, minWidth: (theme) => theme.spacing(23) }}>
      <FormControl
        size="small"
        disabled={!signedIn || status === 'loading' || status === 'saving' || status === 'expired'}
      >
        <InputLabel id="weekly-label">{t('weekly')}</InputLabel>
        <Select
          labelId="weekly-label"
          id="weekly"
          label={t('weekly')}
          value={goal}
          onChange={(event) => void save(Number(event.target.value) as Goal)}
        >
          {([3, 5, 7] as const).map((value) => (
            <MenuItem key={value} value={value}>
              {t('sessions', { n: value })}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {!signedIn ? <Typography variant="caption">{t('goalSignIn')}</Typography> : null}
      {status === 'loading' || status === 'saving' ? (
        <Typography variant="caption" role="status">
          {t(status === 'loading' ? 'goalLoading' : 'goalSaving')}
        </Typography>
      ) : null}
      {status === 'saved' ? (
        <Typography variant="caption" role="status">
          {t('goalSaved')}
        </Typography>
      ) : null}
      {status === 'error' || status === 'expired' ? (
        <Alert severity="warning">
          {t(status === 'expired' ? 'goalExpired' : 'goalError')}
          {status === 'expired' ? (
            <Button component={NextLink} href="/login">
              {t('goalSignInAgain')}
            </Button>
          ) : (
            <Button onClick={() => void save(pending.current)}>{t('goalRetry')}</Button>
          )}
        </Alert>
      ) : null}
    </Stack>
  );
}
