'use client';

import { useState, type ReactNode } from 'react';
import NextLink from 'next/link';
import Button from '@mui/material/Button';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useColorScheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Collapse from '@mui/material/Collapse';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import WeeklyGoal from './WeeklyGoal';
import type { WeeklyGoal as Goal } from '@/lib/preferences';
import PageHeader from '@/components/ui/PageHeader';
import BoardIcon from '@/components/ui/icons/BoardIcon';
import PaperAccent from '@/components/ui/icons/PaperAccent';
import CalloutRibbon from '@/components/ui/icons/CalloutRibbon';
import PaletteOutlined from '@mui/icons-material/PaletteOutlined';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import DesktopWindowsOutlined from '@mui/icons-material/DesktopWindowsOutlined';
import ArrowForward from '@mui/icons-material/ArrowForward';

function SettingCard({
  icon,
  title,
  description,
  tone = 'purple',
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  tone?: 'purple' | 'green' | 'amber' | 'rose';
  children: ReactNode;
}) {
  const colors = {
    purple: ['pastel.lilac', 'secondary.main'],
    green: ['pastel.mint', 'success.dark'],
    amber: ['pastel.sand', 'warning.main'],
    rose: ['pastel.rose', 'error.main'],
  }[tone];
  return (
    <Card sx={{ p: { xs: 2.5, md: 3 } }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 0.9fr) minmax(0, 1.4fr)' },
          gap: { xs: 2, md: 3 },
          alignItems: 'start',
        }}
      >
        <Stack direction="row" sx={{ gap: 1.5, alignItems: 'flex-start' }}>
          <Box
            sx={{
              inlineSize: 44,
              blockSize: 44,
              borderRadius: '50%',
              bgcolor: colors[0],
              color: colors[1],
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              '& svg': { fontSize: 22 },
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography component="h2" variant="h3" sx={{ mb: 0.5 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Box>
        </Stack>
        <Box sx={{ minInlineSize: 0 }}>{children}</Box>
      </Box>
    </Card>
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
    <FormControl disabled={disabled} size="small" sx={{ flex: 1, minInlineSize: 0 }}>
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

function OverviewRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2, py: 0.75 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'end' }}>
        {value}
      </Typography>
    </Stack>
  );
}

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
  const app = useTranslations('app');
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

  const themeLabel = t(mode ?? 'system');
  const languageLabel = t(locale === 'vi' ? 'vietnamese' : 'english');

  return (
    <Stack sx={{ gap: { xs: 2.5, md: 3 } }}>
      <PageHeader title={t('title')} subtitle={t('deferred')} note={app('paperNotes.settings')} />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) 330px' },
          gap: { xs: 2.5, md: 3 },
          alignItems: 'start',
        }}
      >
        <Stack sx={{ gap: 2.5 }}>
          <SettingCard
            icon={<BoardIcon name="globe" />}
            title={t('language')}
            description={t('languageBody')}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2 }}>
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
                onChange={(value) =>
                  change('explanation', value as LocalPreferences['explanation'])
                }
              />
            </Stack>
          </SettingCard>
          <SettingCard
            icon={<BoardIcon name="target" />}
            tone="green"
            title={t('goals')}
            description={t('goalsBody')}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2, alignItems: 'start' }}>
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
            </Stack>
          </SettingCard>
          <SettingCard
            icon={<PaletteOutlined />}
            tone="amber"
            title={t('appearance')}
            description={t('appearanceBody')}
          >
            <Stack sx={{ gap: 1 }}>
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
                sx={{
                  bgcolor: 'background.default',
                  borderRadius: 2.5,
                  p: 0.5,
                  gap: 0.5,
                  '& > button': { px: 2, py: 1, gap: 1, flex: 1, fontSize: '0.8125rem' },
                }}
              >
                <ToggleButton value="light">
                  <LightModeOutlined sx={{ fontSize: 18 }} />
                  {t('light')}
                </ToggleButton>
                <ToggleButton value="dark">
                  <DarkModeOutlined sx={{ fontSize: 18 }} />
                  {t('dark')}
                </ToggleButton>
                <ToggleButton value="system">
                  <DesktopWindowsOutlined sx={{ fontSize: 18 }} />
                  {t('system')}
                </ToggleButton>
              </ToggleButtonGroup>
              <Typography variant="caption" color="text.secondary">
                {t('themeNote')}
              </Typography>
            </Stack>
          </SettingCard>
          <SettingCard
            icon={<BoardIcon name="crown" />}
            title={t('plan')}
            description={t('planBody')}
          >
            <Stack sx={{ gap: 1 }}>
              <Chip
                label={t('free')}
                variant="tonal"
                color="primary"
                sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
              />
              <Typography variant="body2" color="text.secondary">
                {t('notConnected')}
              </Typography>
            </Stack>
          </SettingCard>
          <SettingCard
            icon={<ShieldOutlined />}
            tone="rose"
            title={t('privacy')}
            description={t('privacyBody')}
          >
            <Typography variant="body2" color="text.secondary">
              {t('deferred')}
            </Typography>
          </SettingCard>
          <Collapse in={status !== 'idle'}>
            <Alert severity={status === 'error' ? 'warning' : 'success'} role="status">
              {t(status === 'error' ? 'saveError' : 'saved')}
            </Alert>
          </Collapse>
        </Stack>
        <Stack sx={{ gap: 2.5, position: { lg: 'sticky' }, insetBlockStart: 96 }}>
          <Card sx={{ p: 3 }}>
            <Stack
              direction="row"
              sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 2 }}
            >
              <Typography component="h2" variant="h3">
                {t('accountTitle')}
              </Typography>
              <Chip label={t('free')} size="small" variant="tonal" color="primary" />
            </Stack>
            <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center' }}>
              <Avatar
                sx={{
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  width: 44,
                  height: 44,
                }}
              >
                <PersonOutlined />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" component="p">
                  {t('pilotAccount')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('accountNote')}
                </Typography>
              </Box>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <OverviewRow label={t('uiLanguage')} value={languageLabel} />
            <OverviewRow label={t('daily')} value={t('minutes', { n: Number(prefs.daily) })} />
            <OverviewRow label={t('weekly')} value={t('sessions', { n: weeklyGoal })} />
            <OverviewRow label={t('theme')} value={themeLabel} />
            {signedIn ? (
              <Button
                component={NextLink}
                href={preview ? '/dev/preview/onboarding' : '/onboarding'}
                variant="outlined"
                fullWidth
                endIcon={<ArrowForward />}
                sx={{ mt: 2 }}
              >
                {t('learningProfile')}
              </Button>
            ) : null}
          </Card>
          <Card
            sx={{
              p: 3,
              position: 'relative',
              overflow: 'clip',
              paddingBlockStart: { xs: 3, md: 19 },
              bgcolor: 'highlighter.light',
              borderColor: 'highlighter.main',
              boxShadow: 'none',
            }}
          >
            <CalloutRibbon />
            <Typography component="h2" variant="h3" sx={{ mb: 1 }}>
              {t('profileTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('profileBody')}
            </Typography>
            <Button
              component={NextLink}
              href={preview ? '/dev/preview/onboarding' : signedIn ? '/onboarding' : '/login'}
              variant="contained"
              endIcon={<ArrowForward />}
            >
              {t(signedIn ? 'learningProfile' : 'signInStart')}
            </Button>
            <PaperAccent
              kind="crown"
              inlineSize={180}
              blockSize={150}
              sx={{ position: 'absolute', insetInlineEnd: 20, insetBlockStart: -8 }}
            />
          </Card>
        </Stack>
      </Box>
    </Stack>
  );
}
