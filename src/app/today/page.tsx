import Today from '@/components/today/Today';
import { currentUser } from '@/lib/auth/server';
import { loadToday } from '@/lib/db/today';
import { nextTask } from '@/lib/next-task';
export default async function Page() {
  const user = await currentUser();
  const { submissions, progress, practice, preferences, learningPath } =
    user && process.env.DATABASE_URL
      ? await loadToday(user.id)
      : {
          submissions: [],
          progress: undefined,
          practice: undefined,
          preferences: undefined,
          learningPath: undefined,
        };
  const unit = learningPath?.units.find((item) =>
    item.lessons.some((lesson) => lesson.state === 'current'),
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
  return (
    <Today
      signedIn={Boolean(user)}
      progress={progress}
      path={path}
      next={nextTask(learningPath)}
      pastTense={practice?.questions.some((question) => question.tag === 'verb-tense')}
      now={new Date().toISOString()}
      due={practice?.questions.length ?? 0}
      weeklyGoal={preferences?.weeklyGoal}
      submissions={submissions.map((submission) => ({
        ...submission,
        title:
          submission.taskId === 'weekend'
            ? 'Weekend message'
            : learningPath?.units
                .flatMap((unit) => unit.lessons)
                .find((lesson) => lesson.task.id === submission.taskId)?.task.title,
        createdAt: submission.createdAt.toISOString(),
      }))}
    />
  );
}
