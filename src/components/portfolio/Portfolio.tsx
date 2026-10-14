'use client';
import { useEffect, useState } from 'react';
import NextLink from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import type { PortfolioPage, WritingVersion } from '@/lib/revision';

export default function Portfolio({ preview = false }: { preview?: boolean }) {
  const t = useTranslations('portfolio');
  const format = useFormatter();
  const [entries, setEntries] = useState<WritingVersion[]>([]);
  const [offset, setOffset] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [requestedOffset, setRequestedOffset] = useState(0);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 10000);
    async function load() {
      try {
        const response = await fetch(
          (preview ? '/dev/preview/portfolio-data' : '/api/portfolio') +
            '?offset=' +
            requestedOffset,
          { signal: controller.signal, cache: 'no-store' },
        );
        if (response.status === 401) {
          if (active) setSessionExpired(true);
          throw new Error('SESSION');
        }
        if (!response.ok) throw new Error('LOAD');
        const payload = (await response.json()) as { data: PortfolioPage };
        if (active) {
          setEntries((current) =>
            requestedOffset === 0
              ? payload.data.entries
              : [
                  ...current,
                  ...payload.data.entries.filter(
                    (entry) => !current.some((saved) => saved.id === entry.id),
                  ),
                ],
          );
          setOffset(payload.data.nextOffset);
          setError(false);
        }
      } catch {
        if (active) setError(true);
      } finally {
        clearTimeout(timer);
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [preview, requestedOffset, retry]);
  return (
    <Stack sx={{ gap: 3 }}>
      <Typography variant="h1">{t('title')}</Typography>
      <Typography color="text.secondary">{t('intro')}</Typography>
      {error ? (
        <Alert
          severity="warning"
          action={
            sessionExpired ? (
              <Button component={NextLink} href="/login">
                {t('signIn')}
              </Button>
            ) : (
              <Button
                disabled={loading}
                onClick={() => {
                  setLoading(true);
                  setRetry((value) => value + 1);
                }}
              >
                {t('retry')}
              </Button>
            )
          }
        >
          {t(sessionExpired ? 'sessionExpired' : 'loadError')}
        </Alert>
      ) : null}
      {entries.map((entry) => (
        <Paper key={entry.id} variant="outlined" sx={{ p: 3 }}>
          <Stack sx={{ gap: 1.5 }}>
            <Typography variant="h3">{t('version', { n: entry.attempt })}</Typography>
            <Typography variant="body2" color="text.secondary">
              {format.dateTime(new Date(entry.createdAt), {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}{' '}
              · {t('words', { n: entry.wordCount })}
            </Typography>
            <Typography dir="ltr" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {entry.text}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1 }}>
              <Button component={NextLink} href={'/feedback/' + entry.id}>
                {t('open')}
              </Button>
              {entry.parentSubmissionId ? (
                <Button
                  variant="outlined"
                  component={NextLink}
                  href={preview ? '/dev/preview/revision' : '/revision/' + entry.id}
                >
                  {t('compare')}
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </Paper>
      ))}
      {loading ? <Typography role="status">{t('loading')}</Typography> : null}
      {!loading && !error && !entries.length ? (
        <Alert
          severity="info"
          action={
            <Button component={NextLink} href="/write/weekend">
              {t('write')}
            </Button>
          }
        >
          {t('empty')}
        </Alert>
      ) : null}
      {!loading && entries.length && offset !== null ? (
        <Button
          variant="outlined"
          onClick={() => {
            setLoading(true);
            setRequestedOffset(offset);
          }}
        >
          {t('older')}
        </Button>
      ) : null}
    </Stack>
  );
}
