import { trackForId } from '@/lib/curriculum';
import { notFound } from 'next/navigation';
import Today from '@/components/today/Today';
import LearningPath from '@/components/curriculum/LearningPath';
import Placement from '@/components/curriculum/Placement';
import LessonView from '@/components/curriculum/LessonView';
import { coursePreview } from '@/mocks/course-preview';
import { pathSample } from '@/mocks/curriculum.sample';
import { noticingSample } from '@/mocks/noticing.sample';
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
import {
  todayProgressSample,
  todaySubmissionsSample,
  todayPathSample,
  todayNextSample,
  todayGoalMetSample,
} from '@/mocks/today.sample';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ screen: string }>;
  searchParams: Promise<{
    revise?: string;
    course?: string;
    lesson?: string;
    task?: string;
    track?: string;
    delay?: string;
  }>;
}) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { screen } = await params;
  const query = await searchParams;
  // Development-only delay makes each route's streaming fallback inspectable.
  const delay = Math.min(8000, Math.max(0, Number(query.delay) || 0));
  if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
  const full = query.course === 'full' || screen === 'course-feedback';
  if (full) {
    const track =
      query.track === 'ielts' || trackForId(query.lesson ?? query.task ?? '') === 'ielts'
        ? 'ielts'
        : 'core';
    const { path } = await coursePreview(track);
    const lessons = path.units.flatMap((unit) => unit.lessons);
    if (screen === 'path') return <LearningPath path={path} track={track} preview fullCourse />;
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
  const carriedTargets = [
    { tag: 'verb-tense', source: 'unit' },
    { tag: 'articles', source: 'carried' },
  ] as const;
  if (screen === 'today-carried' && todayNextSample.kind === 'lesson')
    return (
      <Today
        preview
        progress={todayProgressSample}
        next={{ ...todayNextSample, advisoryTargets: [...carriedTargets] }}
      />
    );
  if (screen === 'lesson-carried')
    return (
      <LessonView
        lesson={{ ...pathSample.units[0].lessons[0], advisoryTargets: [...carriedTargets] }}
        preview
      />
    );
  if (screen === 'read-summary' || screen === 'read-continuation') {
    const mode = screen === 'read-summary' ? ('summary' as const) : ('continuation' as const);
    return (
      <LiveStudio
        initialText=""
        task={{
          ...pathSample.units[0].lessons[0].task,
          id: 'reading-preview',
          targetLevel: 'B1',
          minWords: 100,
          maxWords: 180,
          scaffold: 'checklist',
          frames: [],
          wordBank: [],
          checklist: [
            'Use your own words',
            'Keep source details consistent',
            'Write a coherent response',
          ],
          title: 'Write from a short reading',
          prompt:
            mode === 'summary'
              ? 'Summarise the passage for a friend.'
              : 'Continue the story with a plausible next event.',
          reading: {
            mode,
            title: 'A shared garden',
            text: 'The neighbours opened a shared garden beside their flats. They planted vegetables and agreed to water them each evening. On Saturday, a family arrived with tools and offered to help. Soon, people who had never spoken before were working together.',
          },
        }}
        preview
      />
    );
  }
  if (screen === 'lesson-noticing') return <LessonView lesson={noticingSample} preview />;
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
        next={todayNextSample}
        submissions={todaySubmissionsSample}
        due={12}
        path={todayPathSample}
        pastTense
      />
    );
  if (screen === 'today-placement')
    return (
      <Today
        preview
        progress={todayProgressSample}
        next={{ kind: 'placement', href: '/placement' }}
      />
    );
  if (screen === 'today-goal-met')
    return <Today preview progress={todayGoalMetSample} weeklyGoal={5} next={todayNextSample} />;
  if (screen === 'today-goal') return <GoalPreview />;
  if (screen === 'settings')
    return <Settings preferences={{ explanation: 'en', daily: '15' }} signedIn preview />;
  if (screen === 'today-account') return <Today signedIn progress={progressSample} due={2} />;
  if (screen === 'practice-page' || screen === 'practice-transfer') return <Practice preview />;
  if (screen === 'progress') return <Progress preview />;
  if (screen === 'progress-empty') return <Progress preview variant="empty" />;
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
  if (
    ['feedback-targets', 'feedback-targets-safety', 'feedback-targets-revision'].includes(screen)
  ) {
    return (
      <FeedbackView
        submissionId="preview"
        text={sampleDraft}
        feedback={{
          ...markedPageSample,
          corrections: locateCorrections(sampleDraft, markedPageSample.corrections),
          target_report: [
            { tag: 'verb-tense', uses: 6, errors: 3, correction_indexes: [0, 1, 2] },
            { tag: 'articles', uses: 0, errors: 0, correction_indexes: [] },
          ],
          safety_flag: screen === 'feedback-targets-safety',
        }}
        hasPreviousVersion={screen === 'feedback-targets-revision'}
        attempt={screen === 'feedback-targets-revision' ? 2 : 1}
        mock
      />
    );
  }
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
