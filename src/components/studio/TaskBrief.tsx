'use client';

import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';

type TaskBriefProps = {
  onInsert: (phrase: string) => void;
  disabled?: boolean;
};

export default function TaskBrief({ onInsert, disabled = false }: TaskBriefProps) {
  const t = useTranslations('studio');
  return (
    <Box>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 2 }}
      >
        <Typography variant="h3">{t('title')}</Typography>
        <Chip label="A2" variant="tonal" color="primary" size="small" />
      </Stack>
      <Typography sx={{ mb: 1 }}>{t('description')}</Typography>
      <Typography variant="body2" color="text.secondary">
        {t('wordRange')}
      </Typography>
      <Divider sx={{ my: 2.5 }} />
      <Typography variant="body2">{t('include')}</Typography>
      <FormGroup>
        {['where', 'what', 'invite'].map((key) => (
          <FormControlLabel
            key={key}
            control={<Checkbox />}
            label={<Typography variant="body2">{t(key)}</Typography>}
          />
        ))}
      </FormGroup>
      <Divider sx={{ my: 2.5 }} />
      <Typography variant="body2" sx={{ mb: 1.5 }}>
        {t('wordBank')}
      </Typography>
      <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1 }}>
        {['lastWeekend', 'evening', 'wouldLike'].map((key) => (
          <Chip
            key={key}
            label={t(key)}
            variant="outlined"
            clickable
            disabled={disabled}
            onClick={() => onInsert(t(key))}
            sx={{ minHeight: 44 }}
          />
        ))}
      </Stack>
    </Box>
  );
}
