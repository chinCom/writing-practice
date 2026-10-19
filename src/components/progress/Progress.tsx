'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { fetchWithStatus } from '@/lib/network-status';
import type { ProgressPageData } from '@/lib/db/progress';
import type { ProgressLoadResult } from '@/lib/progress-load';
import ActionNotice from '@/components/shared/ActionNotice';
import NavigationButton from '@/components/shared/NavigationButton';
import ActionButton from '@/components/shared/ActionButton';
import ProgressLayout, { ProgressLoadingPanels } from './ProgressLayout';

type ProgressReport = {
  data: ProgressPageData;
  Panels: typeof import('./ProgressPanels').default;
};

export function ProgressContent({
  preview = false,
  variant,
  initialReport,
}: {
  preview?: boolean;
  variant?: 'empty';
  initialReport?: Promise<ProgressLoadResult>;
}) {
  const t = useTranslations('progress');
  const [report, setReport] = useState<ProgressReport | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => {
      controller.abort();
      if (active) setError('loadError');
    }, 15000);
    const dataRequest =
      initialReport && attempt === 0
        ? Promise.resolve(initialReport).then((result) => {
            if (!result.ok) throw new Error('loadError');
            return result.data;
          })
        : fetchWithStatus(
            preview
              ? '/dev/preview/progress-data' + (variant === 'empty' ? '?variant=empty' : '')
              : '/api/progress',
            {
              signal: controller.signal,
              cache: 'no-store',
            },
          ).then(async (response) => {
            if (!response.ok) throw new Error(response.status === 401 ? 'session' : 'loadError');
            const body = await response.json();
            return body.data as ProgressPageData;
          });
    // Download the report alongside its data, then replace the skeleton in one render.
    Promise.all([dataRequest, import('./ProgressPanels')])
      .then(([data, { default: Panels }]) => {
        if (active && !controller.signal.aborted) setReport({ data, Panels });
      })
      .catch((reason) => {
        if (active) setError(reason.message === 'session' ? 'session' : 'loadError');
      })
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [attempt, preview, variant, initialReport]);
  return (
    <>
      {report ? (
        <report.Panels data={report.data} preview={preview} />
      ) : error ? (
        <ActionNotice
          severity="warning"
          message={t(error)}
          action={
            error === 'session' ? (
              <NavigationButton href="/login">{t('signIn')}</NavigationButton>
            ) : (
              <ActionButton
                tone="quiet"
                onClick={() => {
                  setError('');
                  setAttempt((value) => value + 1);
                }}
              >
                {t('retry')}
              </ActionButton>
            )
          }
        />
      ) : (
        <ProgressLoadingPanels />
      )}
    </>
  );
}

export default function Progress(props: { preview?: boolean; variant?: 'empty' }) {
  return (
    <ProgressLayout>
      <ProgressContent {...props} />
    </ProgressLayout>
  );
}
