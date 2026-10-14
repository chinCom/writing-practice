'use client';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import { signOut } from '@/app/login/actions';

export interface SavedSubmission {
  id: string;
  createdAt: string;
  wordCount: number;
  attempt: number;
}
export default function SavedFeedback({ submissions }: { submissions: SavedSubmission[] }) {
  const t = useTranslations('learning');
  const auth = useTranslations('auth');
  const portfolio = useTranslations('portfolio');
  const format = useFormatter();
  const router = useRouter();
  async function leaveAccount() {
    await signOut();
    router.refresh();
  }
  return (
    <Stack sx={{ gap: 2 }}>
      <Typography variant="h3">{t('recent')}</Typography>
      {submissions.length ? (
        submissions.map((submission) => (
          <Paper key={submission.id} variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1">
              {format.dateTime(new Date(submission.createdAt), {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {t('words', { n: submission.wordCount })} · {t('attempt', { n: submission.attempt })}
            </Typography>
            <Button component={NextLink} href={'/feedback/' + submission.id}>
              {t('open')}
            </Button>
          </Paper>
        ))
      ) : (
        <Typography color="text.secondary">{t('empty')}</Typography>
      )}
      <Button component={NextLink} href="/portfolio" sx={{ alignSelf: 'start' }}>
        {portfolio('title')}
      </Button>
      <Button variant="outlined" onClick={leaveAccount} sx={{ alignSelf: 'start' }}>
        {auth('signOut')}
      </Button>
    </Stack>
  );
}
