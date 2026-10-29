'use client';

import { useTranslations } from 'next-intl';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import PageHeader from '@/components/shared/PageHeader';
import ProfileField from './ProfileField';
import GoalTargetFields from './GoalTargetFields';
import { withGoalTarget, type LearningProfile } from '@/lib/profile';
import ActionButton from '@/components/shared/ActionButton';
import NavigationButton from '@/components/shared/NavigationButton';
import { SkeletonMask, SkeletonPanel } from '@/components/shared/ContentSkeleton';

// Same shape as the form's default profile, so the masked target fields take the loaded height.
const placeholder: LearningProfile = withGoalTarget({
  nativeLanguage: 'en',
  goal: 'general',
  startingLevel: 'A2',
  dailyMinutes: 15,
  targetLevel: null,
  targetScore: null,
  targetDate: null,
});

function MaskedField({
  name,
}: {
  name: 'nativeLanguage' | 'goal' | 'startingLevel' | 'dailyMinutes';
}) {
  return (
    <SkeletonMask loading variant="rounded">
      <ProfileField name={name} value="" disabled options={[]} onChange={() => undefined} />
    </SkeletonMask>
  );
}

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
            <MaskedField name="nativeLanguage" />
            <MaskedField name="goal" />
            <MaskedField name="startingLevel" />
            <SkeletonMask loading variant="rounded">
              <Stack sx={{ gap: 3 }}>
                <GoalTargetFields profile={placeholder} disabled onChange={() => undefined} />
              </Stack>
            </SkeletonMask>
            <MaskedField name="dailyMinutes" />
            <Typography variant="body2" color="text.secondary">
              {t('selfReported')}
            </Typography>
            <Alert severity="info">{t('goalScopeCore')}</Alert>
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
