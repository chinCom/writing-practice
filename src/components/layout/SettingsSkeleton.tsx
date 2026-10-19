'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import PageHeader from '@/components/shared/PageHeader';
import PreferenceSelect from './PreferenceSelect';
import {
  ContentSkeleton,
  SkeletonButton,
  SkeletonMask,
  SkeletonPanel,
  SkeletonText,
} from '@/components/shared/ContentSkeleton';

function SettingCardSkeleton({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <SkeletonPanel>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 0.9fr) minmax(0, 1.4fr)' },
          gap: { xs: 2, md: 3 },
          alignItems: 'start',
        }}
      >
        <Stack direction="row" sx={{ gap: 1.5 }}>
          <ContentSkeleton variant="rounded" width={40} height={40} sx={{ flexShrink: 0 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h3" sx={{ marginBlockEnd: 0.5 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Box>
        </Stack>
        <Box sx={{ minInlineSize: 0 }}>{children}</Box>
      </Box>
    </SkeletonPanel>
  );
}

export default function SettingsSkeleton() {
  const t = useTranslations('settings');
  const app = useTranslations('app');
  return (
    <Stack data-ui="settings-skeleton" sx={{ gap: { xs: 2.5, md: 3 } }}>
      <PageHeader title={t('title')} subtitle={t('deferred')} note={app('paperNotes.settings')} />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) 330px' },
          gap: { xs: 2.5, md: 3 },
          alignItems: 'start',
        }}
      >
        <Stack sx={{ gap: 2.5 }}>
          {['language', 'goals'].map((section) => (
            <SettingCardSkeleton key={section} title={t(section)} description={t(section + 'Body')}>
              <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2 }}>
                {(section === 'language' ? ['uiLanguage', 'explanation'] : ['daily', 'weekly']).map(
                  (field) => (
                    <Box key={field} sx={{ flex: 1, minInlineSize: 0 }}>
                      <SkeletonMask loading variant="rounded">
                        <PreferenceSelect
                          id={'loading-' + field}
                          label={t(field)}
                          value=""
                          options={[]}
                          disabled
                          onChange={() => undefined}
                        />
                      </SkeletonMask>
                    </Box>
                  ),
                )}
              </Stack>
            </SettingCardSkeleton>
          ))}
          <SettingCardSkeleton title={t('appearance')} description={t('appearanceBody')}>
            <Stack sx={{ gap: 1 }}>
              <ContentSkeleton variant="rounded" height={40} />
              <Typography variant="caption" color="text.secondary">
                {t('themeNote')}
              </Typography>
            </Stack>
          </SettingCardSkeleton>
          <SettingCardSkeleton title={t('plan')} description={t('planBody')}>
            <Stack sx={{ gap: 1 }}>
              <ContentSkeleton variant="rounded" width={65} height={28} />
              <Typography variant="body2" color="text.secondary">
                {t('notConnected')}
              </Typography>
            </Stack>
          </SettingCardSkeleton>
          <SettingCardSkeleton title={t('privacy')} description={t('privacyBody')}>
            <Typography variant="body2" color="text.secondary">
              {t('deferred')}
            </Typography>
          </SettingCardSkeleton>
        </Stack>
        <Stack sx={{ gap: 2.5 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h3" sx={{ marginBlockEnd: 2 }}>
              {t('accountTitle')}
            </Typography>
            <Stack direction="row" sx={{ gap: 2 }}>
              <ContentSkeleton variant="circular" width={44} height={44} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1">{t('pilotAccount')}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('accountNote')}
                </Typography>
              </Box>
            </Stack>
            <Divider sx={{ marginBlock: 2 }} />
            {['uiLanguage', 'daily', 'weekly', 'theme'].map((row) => (
              <Stack
                key={row}
                direction="row"
                sx={{ justifyContent: 'space-between', gap: 2, paddingBlock: 0.75 }}
              >
                <Typography variant="body2">{t(row)}</Typography>
                <SkeletonText variant="body2" width={80} />
              </Stack>
            ))}
            <Box sx={{ marginBlockStart: 2 }}>
              <SkeletonButton width="100%" />
            </Box>
          </Paper>
          <SkeletonPanel sx={{ paddingBlockStart: { xs: 3, md: 19 } }}>
            <Typography variant="h3">{t('profileTitle')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('profileBody')}
            </Typography>
            <SkeletonButton width="100%" />
          </SkeletonPanel>
        </Stack>
      </Box>
    </Stack>
  );
}
