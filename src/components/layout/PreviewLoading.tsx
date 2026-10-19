'use client';

import { useParams } from 'next/navigation';
import PageLoading from '@/components/shared/PageLoading';
import TodaySkeleton from '@/components/today/TodaySkeleton';
import PathSkeleton from '@/components/curriculum/PathSkeleton';
import LessonSkeleton from '@/components/curriculum/LessonSkeleton';
import PlacementSkeleton from '@/components/curriculum/PlacementSkeleton';
import StudioSkeleton from '@/components/studio/StudioSkeleton';
import FeedbackSkeleton from '@/components/feedback/FeedbackSkeleton';
import PracticeSkeleton from '@/components/practice/PracticeSkeleton';
import ProgressSkeleton from '@/components/progress/ProgressSkeleton';
import PortfolioSkeleton from '@/components/portfolio/PortfolioSkeleton';
import RevisionSkeleton from '@/components/portfolio/RevisionSkeleton';
import SettingsSkeleton from './SettingsSkeleton';
import OnboardingSkeleton from '@/components/onboarding/OnboardingSkeleton';

function PreviewSkeleton({ screen }: { screen: string }) {
  if (screen.startsWith('today')) return <TodaySkeleton />;
  if (screen === 'path') return <PathSkeleton />;
  if (screen.startsWith('lesson')) return <LessonSkeleton />;
  if (screen === 'placement') return <PlacementSkeleton />;
  if (screen === 'onboarding') return <OnboardingSkeleton />;
  if (screen === 'settings') return <SettingsSkeleton />;
  if (screen.startsWith('practice')) return <PracticeSkeleton />;
  if (screen.startsWith('progress')) return <ProgressSkeleton />;
  if (screen === 'portfolio') return <PortfolioSkeleton />;
  if (screen === 'revision') return <RevisionSkeleton />;
  if (screen.includes('feedback')) return <FeedbackSkeleton />;
  return <StudioSkeleton />;
}

export default function PreviewLoading() {
  const { screen } = useParams<{ screen: string }>();
  return (
    <PageLoading>
      <PreviewSkeleton screen={screen} />
    </PageLoading>
  );
}
