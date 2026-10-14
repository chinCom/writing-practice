'use client';
import { useState } from 'react';
import NextLink from 'next/link';
import Button from '@mui/material/Button';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useColorScheme } from '@mui/material/styles';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import Alert from '@mui/material/Alert';
import Collapse from '@mui/material/Collapse';
import WeeklyGoal from './WeeklyGoal';
import type { WeeklyGoal as Goal } from '@/lib/preferences';

import type { ReactNode } from 'react';
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 3, py: 3 }}>
      <Typography variant="subtitle1" sx={{ minWidth: (theme) => theme.spacing(17) }}>
        {label}
      </Typography>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        useFlexGap
        sx={{ flexWrap: 'wrap', gap: 2, flex: 1 }}
      >
        {children}
      </Stack>
    </Stack>
  );
}
function PreferenceSelect({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <FormControl
      disabled={disabled}
      size="small"
      sx={{ minWidth: (theme) => theme.spacing(23), flex: 1 }}
    >
      <InputLabel id={id + '-label'}>{label}</InputLabel>
      <Select
        labelId={id + '-label'}
        id={id}
        label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
export type LocalPreferences = {
  explanation: 'es' | 'en' | 'vi';
  daily: '5' | '15' | '30';
};
export default function Settings({
  preferences,
  weeklyGoal = 5,
  signedIn = false,
  preview = false,
}: {
  preferences: LocalPreferences;
  weeklyGoal?: Goal;
  signedIn?: boolean;
  preview?: boolean;
}) {
  const t = useTranslations('settings');
  const locale = useLocale();
  const router = useRouter();
  const { mode, setMode } = useColorScheme();
  const [prefs, setPrefs] = useState(preferences);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  function save(key: string, value: string) {
    try {
      document.cookie =
        key + '=' + encodeURIComponent(value) + '; Path=/; Max-Age=31536000; SameSite=Lax';
      const saved = document.cookie
        .split('; ')
        .some((part) => part === key + '=' + encodeURIComponent(value));
      setStatus(saved ? 'saved' : 'error');
    } catch {
      setStatus('error');
    }
  }
  function change<K extends keyof LocalPreferences>(key: K, value: LocalPreferences[K]) {
    setPrefs((previous) => ({ ...previous, [key]: value }));
    save(key, value);
  }
  return (
    <Container maxWidth="md" sx={{ marginInlineStart: 0, p: 0 }}>
      <Typography variant="h1" sx={{ mb: 3 }}>
        {t('title')}
      </Typography>
      {signedIn ? (
        <Button
          component={NextLink}
          href={preview ? '/dev/preview/onboarding' : '/onboarding'}
          sx={{ mb: 2 }}
        >
          {t('learningProfile')}
        </Button>
      ) : null}
      <Divider />
      <Row label={t('language')}>
        <PreferenceSelect
          id="locale"
          label={t('uiLanguage')}
          value={locale}
          options={[
            { value: 'en', label: t('english') },
            { value: 'vi', label: t('vietnamese') },
          ]}
          onChange={(value) => {
            save('locale', value);
            router.refresh();
          }}
        />
        <PreferenceSelect
          disabled
          id="explanation"
          label={t('explanation')}
          value={prefs.explanation}
          options={[
            { value: 'es', label: t('spanish') },
            { value: 'en', label: t('english') },
            { value: 'vi', label: t('vietnamese') },
          ]}
          onChange={(value) => change('explanation', value as LocalPreferences['explanation'])}
        />
      </Row>
      <Divider />
      <Row label={t('goals')}>
        <PreferenceSelect
          disabled
          id="daily"
          label={t('daily')}
          value={prefs.daily}
          options={['5', '15', '30'].map((value) => ({
            value,
            label: t('minutes', { n: Number(value) }),
          }))}
          onChange={(value) => change('daily', value as LocalPreferences['daily'])}
        />
        <WeeklyGoal initialGoal={weeklyGoal} signedIn={signedIn} preview={preview} />
      </Row>
      <Divider />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('deferred')}
      </Typography>
      <Row label={t('appearance')}>
        <Stack sx={{ gap: 1 }}>
          <Typography variant="body2">{t('theme')}</Typography>
          <ToggleButtonGroup
            exclusive
            value={mode ?? 'system'}
            aria-label={t('theme')}
            onChange={(_, value: 'light' | 'dark' | 'system' | null) => {
              if (value) {
                try {
                  setMode(value);
                  setStatus('saved');
                } catch {
                  setStatus('error');
                }
              }
            }}
          >
            {(['light', 'dark', 'system'] as const).map((value) => (
              <ToggleButton key={value} value={value}>
                {t(value)}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
      </Row>
      <Divider />
      <Row label={t('plan')}>
        <Typography variant="body2" color="text.secondary">
          {t('notConnected')}
        </Typography>
      </Row>
      <Divider />
      <Row label={t('privacy')}>
        <Typography variant="body2" color="text.secondary">
          {t('privacyBody')}
        </Typography>
      </Row>
      <Collapse in={status !== 'idle'}>
        <Box sx={{ mt: 2 }}>
          <Alert severity={status === 'error' ? 'warning' : 'success'} role="status">
            {t(status === 'error' ? 'saveError' : 'saved')}
          </Alert>
        </Box>
      </Collapse>
    </Container>
  );
}
