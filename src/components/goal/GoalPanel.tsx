'use client';

import { useTranslations } from 'next-intl';
import type { GoalSummary } from '@/lib/goal';
import SectionPanel from '@/components/shared/SectionPanel';
import GoalOverview from './GoalOverview';

/** The goal section that opens the Progress report. */
export default function GoalPanel({
  summary,
  preview = false,
}: {
  summary: GoalSummary;
  preview?: boolean;
}) {
  const t = useTranslations('goal');
  return (
    <SectionPanel title={t('title')} titleId="goal-panel-title">
      <GoalOverview summary={summary} preview={preview} />
    </SectionPanel>
  );
}
