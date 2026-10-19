'use client';
import { fetchWithStatus } from '@/lib/network-status';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { profileResult, type LearningProfile } from '@/lib/profile';
import PageHeader from '@/components/shared/PageHeader';
import NavigationButton from '@/components/shared/NavigationButton';
import ActionButton from '@/components/shared/ActionButton';
import { LoadingContent } from '@/components/shared/ContentSkeleton';
import OnboardingSkeleton from './OnboardingSkeleton';
import ProfileField from './ProfileField';

const defaultProfile: LearningProfile = {
  nativeLanguage: 'en',
  goal: 'general',
  startingLevel: 'A2',
  dailyMinutes: 15,
};

export default function Onboarding({
  initialProfile,
  preview = false,
}: {
  initialProfile?: LearningProfile | null;
  preview?: boolean;
}) {
  const t = useTranslations('onboarding');
  const app = useTranslations('app');
  const [profile, setProfile] = useState<LearningProfile>(initialProfile ?? defaultProfile);
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'saving' | 'saved' | 'error' | 'expired'
  >(preview ? 'loading' : 'idle');
  useEffect(() => {
    if (!preview) return;
    const controller = new AbortController();
    fetchWithStatus('/api/profile', {
      cache: 'no-store',
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
    })
      .then(async (response) => {
        if (response.status === 401) {
          setStatus('expired');
          return;
        }
        if (!response.ok) throw new Error('PROFILE_LOAD_FAILED');
        const result = profileResult.parse(await response.json());
        if (controller.signal.aborted) return;
        setProfile(result.profile ?? defaultProfile);
        setStatus('idle');
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('error');
      });
    return () => controller.abort();
  }, [preview]);
  async function save() {
    if (status === 'loading' || status === 'saving' || status === 'expired') return;
    setStatus('saving');
    try {
      const response = await fetchWithStatus('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
        signal: AbortSignal.timeout(10000),
      });
      if (response.status === 401) {
        setStatus('expired');
        return;
      }
      if (!response.ok) throw new Error('PROFILE_SAVE_FAILED');
      const result = profileResult.parse(await response.json());
      if (!result.profile) throw new Error('PROFILE_MISSING');
      setProfile(result.profile);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }
  const disabled = status === 'loading' || status === 'saving' || status === 'expired';
  function change<K extends keyof LearningProfile>(name: K, value: LearningProfile[K]) {
    setProfile((previous) => ({ ...previous, [name]: value }));
    setStatus('idle');
  }
  if (status === 'loading')
    return (
      <LoadingContent label={t('loading')}>
        <OnboardingSkeleton />
      </LoadingContent>
    );
  return (
    <Container maxWidth="md" disableGutters sx={{ marginInlineStart: 0 }}>
      <Stack sx={{ gap: 3 }}>
        <PageHeader title={t('title')} subtitle={t('intro')} note={app('paperNotes.default')} />
        <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 }, maxInlineSize: 760 }}>
          <Stack sx={{ gap: 3 }}>
            <ProfileField
              name="nativeLanguage"
              value={profile.nativeLanguage}
              disabled={disabled}
              onChange={(value) =>
                change('nativeLanguage', value as LearningProfile['nativeLanguage'])
              }
              options={(['en', 'vi', 'other'] as const).map((value) => ({
                value,
                label: t('languages.' + value),
              }))}
            />
            <ProfileField
              name="goal"
              value={profile.goal}
              disabled={disabled}
              onChange={(value) => change('goal', value as LearningProfile['goal'])}
              options={(['general', 'work', 'ielts', 'toefl'] as const).map((value) => ({
                value,
                label: t('goals.' + value),
              }))}
            />
            <ProfileField
              name="startingLevel"
              value={profile.startingLevel}
              disabled={disabled}
              onChange={(value) =>
                change('startingLevel', value as LearningProfile['startingLevel'])
              }
              options={(['PRE_A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map((value) => ({
                value,
                label: value === 'PRE_A1' ? t('zero') : value,
              }))}
            />
            <ProfileField
              name="dailyMinutes"
              value={String(profile.dailyMinutes)}
              disabled={disabled}
              onChange={(value) =>
                change('dailyMinutes', Number(value) as LearningProfile['dailyMinutes'])
              }
              options={([5, 15, 30] as const).map((value) => ({
                value: String(value),
                label: t('minutes', { n: value }),
              }))}
            />
            <Typography variant="body2" color="text.secondary">
              {t('selfReported')}
            </Typography>
            <Alert severity="info">{t('currentScope')}</Alert>
            {status === 'error' || status === 'expired' ? (
              <Alert severity="warning">
                {t(status)}
                {status === 'expired' ? (
                  <NavigationButton href="/login">{t('signInAgain')}</NavigationButton>
                ) : null}
              </Alert>
            ) : null}
            {status === 'saved' ? (
              <Alert severity="success" role="status">
                {t('saved')}
              </Alert>
            ) : null}
            {status === 'saving' ? <Typography role="status">{t(status)}</Typography> : null}
            <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2 }}>
              <ActionButton tone="primary" disabled={disabled} onClick={() => void save()}>
                {t('save')}
              </ActionButton>
              <NavigationButton href={preview ? '/dev/preview/today' : '/today'}>
                {t('continue')}
              </NavigationButton>
            </Stack>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
