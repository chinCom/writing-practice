import Today from '@/components/today/Today';
import { currentUser } from '@/lib/auth/server';
import { recentSubmissions } from '@/lib/db/queries';
export default async function Page() {
  const user = await currentUser();
  const submissions = user && process.env.DATABASE_URL ? await recentSubmissions(user.id) : [];
  return (
    <Today
      signedIn={Boolean(user)}
      submissions={submissions.map((submission) => ({
        ...submission,
        createdAt: submission.createdAt.toISOString(),
      }))}
    />
  );
}
