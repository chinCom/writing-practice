'use client';

import { useTranslations } from 'next-intl';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import FlagOutlined from '@mui/icons-material/FlagOutlined';
import type { GoalSummary } from '@/lib/goal';
import type { NextTask } from '@/lib/next-task';
import SectionTitle from '@/components/shared/SectionTitle';
import GoalOverview from './GoalOverview';

/** Today's goal card: the target, where the learner is, and this week's plan. */
export default function GoalCard({
  summary,
  next,
  preview = false,
}: {
  summary: GoalSummary;
  next?: NextTask;
  preview?: boolean;
}) {
  const t = useTranslations('goal');
  return (
    <Card component="section" aria-labelledby="goal-title" data-goal-card>
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack sx={{ gap: 2 }}>
          <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
            <FlagOutlined sx={{ color: 'secondary.main' }} aria-hidden="true" />
            <SectionTitle id="goal-title">{t('title')}</SectionTitle>
          </Stack>
          <GoalOverview summary={summary} next={next} preview={preview} />
        </Stack>
      </CardContent>
    </Card>
  );
}
