'use client';

import { useTranslations } from 'next-intl';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import PageHeader from '@/components/shared/PageHeader';
import ProfileField from './ProfileField';
import ActionButton from '@/components/shared/ActionButton';
import NavigationButton from '@/components/shared/NavigationButton';
import { SkeletonMask, SkeletonPanel } from '@/components/shared/ContentSkeleton';

export default function OnboardingSkeleton() {
  const t = useTranslations('onboarding');
  return (
    <Container
      data-ui="onboarding-skeleton"
      maxWidth="md"
      disableGutters
      sx={{ marginInlineStart: 0 }}
    >
      <Stack sx={{ gap: 3 }}>
        <PageHeader title={t('title')} subtitle={t('intro')} />
        <SkeletonPanel padding={{ xs: 2.5, sm: 4 }} sx={{ maxInlineSize: 760 }}>
          <Stack sx={{ gap: 3 }}>
            {(['nativeLanguage', 'goal', 'startingLevel', 'dailyMinutes'] as const).map((field) => (
              <SkeletonMask key={field} loading variant="rounded">
                <ProfileField
                  name={field}
                  value=""
                  disabled
                  options={[]}
                  onChange={() => undefined}
                />
              </SkeletonMask>
            ))}
            <Typography variant="body2" color="text.secondary">
              {t('selfReported')}
            </Typography>
            <Alert severity="info">{t('currentScope')}</Alert>
            <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2 }}>
              <ActionButton tone="primary" disabled>
                {t('save')}
              </ActionButton>
              <NavigationButton href="/today">{t('continue')}</NavigationButton>
            </Stack>
          </Stack>
        </SkeletonPanel>
      </Stack>
    </Container>
  );
}
