import Today from '@/components/today/Today';
import { currentUser } from '@/lib/auth/server';
import { loadToday } from '@/lib/db/today';
import { nextTask } from '@/lib/next-task';
import { firstSessionGuide } from '@/lib/first-session';
import { pageMetadata } from '@/lib/i18n/metadata';
export function generateMetadata() {
  return pageMetadata('today');
}
export default async function Page() {
  const user = await currentUser();
  const { submissions, progress, practice, preferences, learningPath, track, paths } =
    user && process.env.DATABASE_URL
      ? await loadToday(user.id)
      : {
          submissions: [],
          progress: undefined,
          practice: undefined,
          preferences: undefined,
          learningPath: undefined,
          track: 'core' as const,
          paths: undefined,
        };
  const unit = learningPath?.units.find((item) =>
    item.lessons.some((lesson) => lesson.state === 'current'),
  );
  // One pass over both tracks replaces a lookup per submission; saved work may come from either.
  const titleByTaskId = new Map(
    [...(paths?.core.units ?? []), ...(paths?.ielts.units ?? [])]
      .flatMap((unit) => unit.lessons)
      .map((lesson) => [lesson.task.id, lesson.task.title] as const),
  );
  const path = unit
    ? {
        level: unit.level,
        title: unit.title,
        steps: unit.lessons.map((lesson) => ({
          title: lesson.title,
          state: lesson.state as 'done' | 'current' | 'locked' | 'available',
        })),
      }
    : undefined;
  const next = nextTask(learningPath, track);
  return (
    <Today
      signedIn={Boolean(user)}
      track={track}
      progress={progress}
      path={path}
      next={next}
      firstSession={firstSessionGuide(submissions, next)}
      pastTense={practice?.questions.some((question) => question.tag === 'verb-tense')}
      now={new Date().toISOString()}
      due={practice?.questions.length ?? 0}
      weeklyGoal={preferences?.weeklyGoal}
      submissions={submissions.map((submission) => ({
        ...submission,
        title:
          submission.taskId === 'weekend'
            ? 'Weekend message'
            : titleByTaskId.get(submission.taskId),
        createdAt: submission.createdAt.toISOString(),
      }))}
    />
  );
}
