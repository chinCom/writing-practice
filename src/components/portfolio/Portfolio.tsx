'use client';

import { fetchWithStatus } from '@/lib/network-status';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import Stack from '@mui/material/Stack';
import ActionNotice from '@/components/shared/ActionNotice';
import EmptyState from '@/components/shared/EmptyState';
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
import PageHeader from '@/components/shared/PageHeader';
import StatTile from '@/components/shared/StatTile';
import NavigationButton from '@/components/shared/NavigationButton';
import ActionButton from '@/components/shared/ActionButton';
import { LoadingContent } from '@/components/shared/ContentSkeleton';
import StatTilesSkeleton from '@/components/shared/StatTilesSkeleton';
import { PortfolioEntriesSkeleton } from './PortfolioSkeleton';

type Filter = 'all' | 'revisions' | 'first';
type Sort = 'newest' | 'oldest' | 'longest';

export default function Portfolio({ preview = false }: { preview?: boolean }) {
  const t = useTranslations('portfolio');
  const app = useTranslations('app');
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
      {loading && !entries.length ? (
        <StatTilesSkeleton
          labels={['savedPieces', 'totalWords', 'withFeedback', 'revisionCount'].map((key) =>
            t(key),
          )}
        />
      ) : (
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
          <StatTile
            label={t('savedPieces')}
            value={entries.length}
            icon={<DescriptionOutlined />}
          />
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
      )}
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
        <ActionNotice
          severity="warning"
          message={t(sessionExpired ? 'sessionExpired' : 'loadError')}
          action={
            sessionExpired ? (
              <NavigationButton href="/login">{t('signIn')}</NavigationButton>
            ) : (
              <ActionButton
                tone="quiet"
                disabled={loading}
                onClick={() => {
                  setLoading(true);
                  setRetry((value) => value + 1);
                }}
              >
                {t('retry')}
              </ActionButton>
            )
          }
        />
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
        <EmptyState
          role="status"
          title={t('noResults')}
          action={
            <ActionButton
              tone="quiet"
              onClick={() => {
                setQuery('');
                setFilter('all');
              }}
            >
              {t('clear')}
            </ActionButton>
          }
        />
      ) : null}
      {loading ? (
        <LoadingContent label={t('loading')}>
          <PortfolioEntriesSkeleton featured={!entries.length && filter === 'all' && !query} />
        </LoadingContent>
      ) : null}
      {!loading && !error && !entries.length ? (
        <EmptyState
          role="status"
          title={t('savedPieces')}
          description={t('empty')}
          action={<NavigationButton href="/write/weekend">{t('write')}</NavigationButton>}
        />
      ) : null}
      {!loading && entries.length && offset !== null ? (
        <ActionButton
          tone="secondary"
          onClick={() => {
            setLoading(true);
            setRequestedOffset(offset);
          }}
          sx={{ alignSelf: 'center' }}
        >
          {t('older')}
        </ActionButton>
      ) : null}
    </Stack>
  );
}
