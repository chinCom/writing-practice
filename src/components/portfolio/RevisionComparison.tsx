'use client';
import { useEffect, useState } from 'react';
import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import { diffWriting, compareScores, type RevisionComparison as Comparison } from '@/lib/revision';

export default function RevisionComparison({
  submissionId,
  preview = false,
}: {
  submissionId: string;
  preview?: boolean;
}) {
  const t = useTranslations('portfolio');
  const scores = useTranslations('feedback');
  const [data, setData] = useState<Comparison | null>(null);
  const [error, setError] = useState<'unavailable' | 'loadError' | 'sessionExpired' | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 10000);
    async function load() {
      try {
        const response = await fetch(
          preview
            ? '/dev/preview/revision-data'
            : '/api/revision?submissionId=' + encodeURIComponent(submissionId),
          { signal: controller.signal, cache: 'no-store' },
        );
        if (!response.ok) {
          if (active)
            setError(
              response.status === 404
                ? 'unavailable'
                : response.status === 401
                  ? 'sessionExpired'
                  : 'loadError',
            );
          return;
        }
        const payload = (await response.json()) as { data: Comparison };
        if (active) {
          setData(payload.data);
          setError(null);
        }
      } catch {
        if (active) setError('loadError');
      } finally {
        clearTimeout(timer);
      }
    }
    void load();
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [submissionId, preview, retry]);
  const deltas = data ? compareScores(data.original.scores, data.current.scores) : null;
  return (
    <Stack sx={{ gap: 3 }}>
      <Typography variant="h1">{t('comparisonTitle')}</Typography>
      <Button
        component={NextLink}
        href={preview ? '/dev/preview/portfolio' : '/portfolio'}
        sx={{ alignSelf: 'start' }}
      >
        {t('back')}
      </Button>
      {error ? (
        <Alert
          severity="warning"
          action={
            error === 'sessionExpired' ? (
              <Button component={NextLink} href="/login">
                {t('signIn')}
              </Button>
            ) : error === 'loadError' ? (
              <Button
                onClick={() => {
                  setError(null);
                  setRetry((value) => value + 1);
                }}
              >
                {t('retry')}
              </Button>
            ) : undefined
          }
        >
          {t(error)}
        </Alert>
      ) : !data ? (
        <Typography role="status">{t('loading')}</Typography>
      ) : null}
      {data && deltas ? (
        <>
          <Typography>
            {t('versions', { before: data.original.attempt, after: data.current.attempt })}
          </Typography>
          <Paper component="section" aria-label={t('changes')} variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h3" sx={{ mb: 2 }}>
              {t('changes')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('legend')}
            </Typography>
            <Typography
              variant="canvas"
              component="p"
              dir="ltr"
              sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
            >
              {diffWriting(data.original.text, data.current.text).map((part, index) => (
                <Typography
                  key={index}
                  component={
                    part.kind === 'added' ? 'ins' : part.kind === 'removed' ? 'del' : 'span'
                  }
                  variant="inherit"
                  sx={{
                    textDecoration:
                      part.kind === 'removed'
                        ? 'line-through'
                        : part.kind === 'added'
                          ? 'underline'
                          : 'none',
                    marginInlineEnd: part.kind === 'removed' ? '0.2em' : undefined,
                    bgcolor: part.kind === 'added' ? 'tonal.success' : 'transparent',
                    fontWeight: part.kind === 'added' ? 600 : 'inherit',
                  }}
                >
                  {part.text}
                </Typography>
              ))}
            </Typography>
            {data.original.text === data.current.text ? (
              <Typography sx={{ mt: 2 }}>{t('unchanged')}</Typography>
            ) : null}
          </Paper>
          <TableContainer component={Paper} variant="outlined">
            <Table aria-label={t('scoreChanges')} size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('score')}</TableCell>
                  <TableCell>{t('before')}</TableCell>
                  <TableCell>{t('after')}</TableCell>
                  <TableCell>{t('delta')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(['task', 'organization', 'grammar', 'vocabulary'] as const).map((key) => (
                  <TableRow key={key}>
                    <TableCell component="th" scope="row">
                      {scores(key)}
                    </TableCell>
                    <TableCell>{data.original.scores[key]}/5</TableCell>
                    <TableCell>{data.current.scores[key]}/5</TableCell>
                    <TableCell>
                      {deltas[key] > 0 ? '+' : ''}
                      {deltas[key]}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="body2" color="text.secondary">
            {t('scoreNote')}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1 }}>
            <Button component={NextLink} href={'/feedback/' + data.original.id}>
              {t('openPrevious')}
            </Button>
            <Button variant="contained" component={NextLink} href={'/feedback/' + data.current.id}>
              {t('openCurrent')}
            </Button>
          </Stack>
        </>
      ) : null}
    </Stack>
  );
}
