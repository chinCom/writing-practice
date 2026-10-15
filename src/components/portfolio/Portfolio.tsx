'use client';
import { useEffect, useState } from 'react';
import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import useMediaQuery from '@mui/material/useMediaQuery';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import type { PortfolioPage, WritingVersion } from '@/lib/revision';
import PortfolioEntry from './PortfolioEntry';

const visuallyHidden = {
  position: 'absolute',
  inlineSize: 1,
  blockSize: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;

export default function Portfolio({ preview = false }: { preview?: boolean }) {
  const t = useTranslations('portfolio');
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
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
      {entries.map((entry, order) => (
        <PortfolioEntry key={entry.id} entry={entry} order={order} preview={preview} />
      ))}
      {loading ? (
        <Stack sx={{ gap: 3 }}>
          <Typography role="status" sx={visuallyHidden}>
            {t('loading')}
          </Typography>
          {[0, 1].map((placeholder) => (
            <Skeleton
              key={placeholder}
              aria-hidden="true"
              variant="rounded"
              height={150}
              animation={reducedMotion ? false : 'pulse'}
            />
          ))}
        </Stack>
      ) : null}
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
