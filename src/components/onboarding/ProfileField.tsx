'use client';

import { useTranslations } from 'next-intl';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

type FieldName = 'nativeLanguage' | 'goal' | 'startingLevel' | 'dailyMinutes';
export default function ProfileField({
  name,
  value,
  options,
  disabled,
  onChange,
}: {
  name: FieldName;
  value: string;
  options: { value: string; label: string }[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const t = useTranslations('onboarding');
  return (
    <FormControl disabled={disabled} fullWidth>
      <InputLabel id={name + '-label'}>{t(name)}</InputLabel>
      <Select
        labelId={name + '-label'}
        id={name}
        label={t(name)}
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
