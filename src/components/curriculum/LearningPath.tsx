'use client';
import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import type { LearningPath as Path } from '@/lib/db/curriculum';
export default function LearningPath({ path, preview = false }: { path: Path; preview?: boolean }) {
  const t = useTranslations('curriculum');
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack sx={{ gap: 3 }}>
        <Typography component="h1" variant="h1">
          {t('pathTitle')}
        </Typography>
        <Typography>{t('pathIntro')}</Typography>
        {!path.chosenLevel ? (
          <Button
            component={NextLink}
            href={preview ? '/dev/preview/placement' : '/placement'}
            variant="contained"
          >
            {t('placementTitle')}
          </Button>
        ) : (
          <Chip
            label={t('startingAt', { level: path.chosenLevel })}
            sx={{ alignSelf: 'flex-start' }}
          />
        )}
        {!path.units.length ? <Alert severity="info">{t('contentPending')}</Alert> : null}
        {path.units.map((unit) => (
          <Paper variant="outlined" key={unit.id} sx={{ p: 3 }}>
            <Stack sx={{ gap: 2 }}>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}>
                <Chip label={unit.level} />
                <Typography variant="h2">{unit.title}</Typography>
              </Stack>
              <Typography>{unit.outcome}</Typography>
              {unit.lessons.map((lesson) => (
                <Stack
                  key={lesson.id}
                  direction={{ xs: 'column', sm: 'row' }}
                  sx={{ gap: 1, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
                >
                  {lesson.state === 'locked' ? (
                    <Button disabled variant="outlined">
                      {lesson.title} · {t('locked')}
                    </Button>
                  ) : (
                    <Button
                      variant={lesson.state === 'current' ? 'contained' : 'outlined'}
                      component={NextLink}
                      href={preview ? '/dev/preview/lesson' : '/lesson/' + lesson.id}
                    >
                      {lesson.title}
                    </Button>
                  )}
                  <Typography variant="caption">
                    {t(lesson.state)}
                    {lesson.task.isCheckpoint ? ' · ' + t('checkpoint') : ''}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>
        ))}
        <Typography variant="body2" color="text.secondary">
          {t('unlockRule')}
        </Typography>
      </Stack>
    </Container>
  );
}
