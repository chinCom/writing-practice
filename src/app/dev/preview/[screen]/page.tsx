import { notFound } from 'next/navigation';
import Today from '@/components/today/Today';
import LearningPath from '@/components/curriculum/LearningPath';
import Placement from '@/components/curriculum/Placement';
import LessonView from '@/components/curriculum/LessonView';
import { coursePreview } from '@/mocks/course-preview';
import { pathSample } from '@/mocks/curriculum.sample';
import Onboarding from '@/components/onboarding/Onboarding';
import GoalPreview from '@/components/today/GoalPreview';
import Settings from '@/components/layout/Settings';
import Practice from '@/components/practice/Practice';
import Progress from '@/components/progress/Progress';
import Portfolio from '@/components/portfolio/Portfolio';
import RevisionComparison from '@/components/portfolio/RevisionComparison';
import Studio from '@/components/studio/Studio';
import LiveStudio from '@/components/studio/LiveStudio';
import FeedbackView from '@/components/feedback/FeedbackView';
import { locateCorrections } from '@/lib/feedback/locate';
import { sampleDraft } from '@/mocks/draft.sample';
import { markedPageSample } from '@/mocks/markedPage.sample';
import { manyCorrectionsSample, manyCorrectionsText } from '@/mocks/manyCorrections.sample';
import { progressSample } from '@/mocks/progress.sample';
import { todayProgressSample, todaySubmissionsSample, todayPathSample } from '@/mocks/today.sample';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ screen: string }>;
  searchParams: Promise<{ revise?: string; course?: string; lesson?: string; task?: string }>;
}) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { screen } = await params;
  const query = await searchParams;
  const full = query.course === 'full' || screen === 'course-feedback';
  if (full) {
    const { path } = await coursePreview();
    const lessons = path.units.flatMap((unit) => unit.lessons);
    if (screen === 'path') return <LearningPath path={path} preview fullCourse />;
    if (screen === 'lesson') {
      const lesson = lessons.find((item) => item.id === query.lesson);
      if (!lesson || lesson.state === 'locked') notFound();
      return <LessonView lesson={lesson} preview fullCourse />;
    }
    if (screen === 'curriculum-write') {
      const lesson = lessons.find((item) => item.task.id === query.task);
      if (!lesson || !lesson.warmupsDone || lesson.state === 'locked') notFound();
      return (
        <LiveStudio key={lesson.task.id} initialText="" task={lesson.task} preview coursePreview />
      );
    }
    if (screen === 'course-feedback')
      return (
        <FeedbackView
          submissionId="preview"
          text={sampleDraft}
          feedback={{ ...markedPageSample, corrections: [] }}
          mock
          coursePreview
          taskId={query.task}
        />
      );
  }
  if (screen === 'path') return <LearningPath path={pathSample} preview />;
  if (screen === 'placement') return <Placement preview />;
  if (screen === 'lesson') return <LessonView lesson={pathSample.units[0].lessons[0]} preview />;
  if (screen === 'curriculum-write')
    return <LiveStudio initialText="" task={pathSample.units[0].lessons[0].task} preview />;
  if (screen === 'onboarding') return <Onboarding preview />;
  if (screen === 'today')
    return (
      <Today
        preview
        progress={todayProgressSample}
        submissions={todaySubmissionsSample}
        due={12}
        path={todayPathSample}
        pastTense
      />
    );
  if (screen === 'today-goal') return <GoalPreview />;
  if (screen === 'settings')
    return <Settings preferences={{ explanation: 'en', daily: '15' }} signedIn preview />;
  if (screen === 'today-account') return <Today signedIn progress={progressSample} due={2} />;
  if (screen === 'practice-page') return <Practice preview />;
  if (screen === 'progress') return <Progress preview />;
  if (screen === 'portfolio') return <Portfolio preview />;
  if (screen === 'revision') return <RevisionComparison submissionId="preview" preview />;
  if (screen === 'write') return <Studio />;
  if (screen === 'live-write')
    return (
      <LiveStudio
        key={(await searchParams).revise ?? 'draft'}
        initialText=""
        parentSubmissionId={(await searchParams).revise === 'preview' ? 'preview' : undefined}
        preview
      />
    );
  if (screen === 'feedback' || screen === 'feedback-many') {
    const feedback = screen === 'feedback-many' ? manyCorrectionsSample : markedPageSample;
    const text = screen === 'feedback-many' ? manyCorrectionsText : sampleDraft;
    return (
      <FeedbackView
        submissionId="preview"
        text={text}
        feedback={{
          ...feedback,
          corrections: locateCorrections(text, feedback.corrections),
        }}
        mock
      />
    );
  }
  notFound();
}
