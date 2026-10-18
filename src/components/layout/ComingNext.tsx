'use client';
import { useTranslations } from 'next-intl';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import NavigationButton from '@/components/shared/NavigationButton';
export default function ComingNext() {
  const t = useTranslations('unavailable');
  return (
    <Container maxWidth="sm" sx={{ marginInlineStart: 0, p: 0 }}>
      <Typography variant="h1" sx={{ mb: 2 }}>
        {t('title')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {t('body')}
      </Typography>
      <NavigationButton href="/today" tone="secondary">
        {t('back')}
      </NavigationButton>
    </Container>
  );
}
