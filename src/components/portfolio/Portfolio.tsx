'use client';

import { fetchWithStatus } from '@/lib/network-status';
import { useEffect, useMemo, useState } from 'react';
import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import useMediaQuery from '@mui/material/useMediaQuery';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import TextFieldsOutlined from '@mui/icons-material/TextFieldsOutlined';
import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined';
import CompareArrowsOutlined from '@mui/icons-material/CompareArrowsOutlined';
import type { PortfolioPage, WritingVersion } from '@/lib/revision';
import PortfolioEntry from './PortfolioEntry';
import PageHeader from '@/components/ui/PageHeader';
import StatTile from '@/components/ui/StatTile';

type Filter = 'all' | 'revisions' | 'first';
type Sort = 'newest' | 'oldest' | 'longest';

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
  const app = useTranslations('app');
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [entries, setEntries] = useState<WritingVersion[]>([]);
  const [offset, setOffset] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [requestedOffset, setRequestedOffset] = useState(0);
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('newest');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 10000);
    async function load() {
      try {
        const response = await fetchWithStatus(
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

  const stats = useMemo(() => {
    const words = entries.reduce((total, entry) => total + entry.wordCount, 0);
    const revisions = entries.filter((entry) => entry.parentSubmissionId).length;
    return { words, revisions };
  }, [entries]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const matched = entries.filter((entry) => {
      if (filter === 'revisions' && !entry.parentSubmissionId) return false;
      if (filter === 'first' && entry.parentSubmissionId) return false;
      return !needle || entry.text.toLocaleLowerCase().includes(needle);
    });
    return [...matched].sort((left, right) => {
      if (sort === 'oldest') return left.createdAt.localeCompare(right.createdAt);
      if (sort === 'longest') return right.wordCount - left.wordCount;
      return right.createdAt.localeCompare(left.createdAt);
    });
  }, [entries, filter, query, sort]);

  return (
    <Stack sx={{ gap: { xs: 2.5, md: 3 } }}>
      <PageHeader title={t('title')} subtitle={t('subtitle')} note={app('paperNotes.portfolio')} />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(4, minmax(0, 1fr))',
          },
          gap: 2,
        }}
      >
        <StatTile label={t('savedPieces')} value={entries.length} icon={<DescriptionOutlined />} />
        <StatTile label={t('totalWords')} value={stats.words} icon={<TextFieldsOutlined />} />
        <StatTile
          label={t('withFeedback')}
          value={entries.length}
          icon={<ChatBubbleOutlineOutlined />}
        />
        <StatTile
          label={t('revisionCount')}
          value={stats.revisions}
          icon={<CompareArrowsOutlined />}
        />
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) auto auto' },
          gap: 1.5,
          alignItems: 'center',
          p: 1.5,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: 3,
        }}
      >
        <TextField
          size="small"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('search')}
          slotProps={{
            htmlInput: { 'aria-label': t('search') },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlined sx={{ fontSize: 19, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minInlineSize: 0 }}
        />
        <Stack
          role="group"
          aria-label={t('filter')}
          direction="row"
          sx={{ gap: 0.75, flexWrap: 'wrap' }}
        >
          {(
            [
              ['all', t('all')],
              ['revisions', t('revisions')],
              ['first', t('firstDrafts')],
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              label={label}
              clickable
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              variant={filter === value ? 'filled' : 'outlined'}
              color={filter === value ? 'primary' : 'default'}
              sx={{
                height: 34,
                px: 0.5,
                bgcolor: filter === value ? 'primary.main' : 'background.paper',
                color: filter === value ? 'primary.contrastText' : 'text.secondary',
                borderColor: 'divider',
              }}
            />
          ))}
        </Stack>
        <TextField
          select
          size="small"
          value={sort}
          onChange={(event) => setSort(event.target.value as Sort)}
          label={t('sort')}
          sx={{ minInlineSize: 170, bgcolor: 'background.paper' }}
        >
          <MenuItem value="newest">{t('newest')}</MenuItem>
          <MenuItem value="oldest">{t('oldest')}</MenuItem>
          <MenuItem value="longest">{t('longest')}</MenuItem>
        </TextField>
      </Box>
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
      {visible.map((entry, order) => (
        <PortfolioEntry
          key={entry.id}
          entry={entry}
          order={order}
          preview={preview}
          featured={order === 0 && filter === 'all' && !query}
        />
      ))}
      {!loading && !error && entries.length > 0 && visible.length === 0 ? (
        <Alert
          severity="info"
          action={
            <Button
              onClick={() => {
                setQuery('');
                setFilter('all');
              }}
            >
              {t('clear')}
            </Button>
          }
        >
          {t('noResults')}
        </Alert>
      ) : null}
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
          sx={{ alignSelf: 'center' }}
        >
          {t('older')}
        </Button>
      ) : null}
    </Stack>
  );
}
