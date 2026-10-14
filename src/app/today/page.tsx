import Today from '@/components/today/Today';
import { currentUser } from '@/lib/auth/server';
import { recentSubmissions } from '@/lib/db/queries';
import { loadProgress } from '@/lib/db/progress';
import { loadPractice } from '@/lib/db/practice';
import { loadPreferences } from '@/lib/db/preferences';
export default async function Page() {
  const user = await currentUser();
  const [submissions, progress, practice, preferences] =
    user && process.env.DATABASE_URL
      ? await Promise.all([
          recentSubmissions(user.id),
          loadProgress(user.id),
          loadPractice(user.id),
          loadPreferences(user.id),
        ])
      : [[], undefined, undefined, undefined];
  return (
    <Today
      signedIn={Boolean(user)}
      progress={progress}
      due={practice?.questions.length ?? 0}
      weeklyGoal={preferences?.weeklyGoal}
      submissions={submissions.map((submission) => ({
        ...submission,
        createdAt: submission.createdAt.toISOString(),
      }))}
    />
  );
}
