'use client';

import { useTranslations } from 'next-intl';
import TextField from '@mui/material/TextField';
import { targetLevelOptions, targetScores, type LearningProfile } from '@/lib/profile';
import ProfileField from './ProfileField';

function TargetLevelField({
  profile,
  disabled,
  onChange,
}: {
  profile: LearningProfile;
  disabled: boolean;
  onChange: (level: NonNullable<LearningProfile['targetLevel']>) => void;
}) {
  const t = useTranslations('onboarding');
  return (
    <ProfileField
      name="targetLevel"
      value={profile.targetLevel ?? ''}
      disabled={disabled}
      helperText={t('targetLevelHelp')}
      onChange={(value) => onChange(value as NonNullable<LearningProfile['targetLevel']>)}
      options={targetLevelOptions(profile.startingLevel).map((value) => ({
        value,
        label: value === 'PRE_A1' ? t('zero') : value,
      }))}
    />
  );
}

function TargetScoreField({
  profile,
  disabled,
  onChange,
}: {
  profile: LearningProfile;
  disabled: boolean;
  onChange: (score: NonNullable<LearningProfile['targetScore']>) => void;
}) {
  const t = useTranslations('onboarding');
  return (
    <ProfileField
      name="targetScore"
      value={profile.targetScore === null ? '' : String(profile.targetScore)}
      disabled={disabled}
      helperText={t('targetScoreHelp')}
      onChange={(value) => onChange(Number(value) as NonNullable<LearningProfile['targetScore']>)}
      options={targetScores.map((score) => ({
        value: String(score),
        label: t('targetScoreOption', { score }),
      }))}
    />
  );
}

export default function GoalTargetFields({
  profile,
  today,
  disabled,
  onChange,
}: {
  profile: LearningProfile;
  today?: string;
  disabled: boolean;
  onChange: (next: Partial<LearningProfile>) => void;
}) {
  const t = useTranslations('onboarding');
  return (
    <>
      {profile.goal === 'ielts' ? (
        <TargetScoreField
          profile={profile}
          disabled={disabled}
          onChange={(targetScore) => onChange({ targetScore })}
        />
      ) : (
        <TargetLevelField
          profile={profile}
          disabled={disabled}
          onChange={(targetLevel) => onChange({ targetLevel })}
        />
      )}
      <TextField
        id="targetDate"
        type="date"
        label={t('targetDate')}
        helperText={t('targetDateHelp')}
        value={profile.targetDate ?? ''}
        disabled={disabled}
        onChange={(event) => onChange({ targetDate: event.target.value || null })}
        slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: today } }}
        fullWidth
      />
    </>
  );
}
