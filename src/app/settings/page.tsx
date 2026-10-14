import { cookies } from 'next/headers';
import { z } from 'zod';
import Settings from '@/components/layout/Settings';
import { currentUser } from '@/lib/auth/server';
import { loadPreferences } from '@/lib/db/preferences';
const Preferences = z.object({
  explanation: z.enum(['es', 'en', 'vi']).catch('en'),
  daily: z.enum(['5', '15', '30']).catch('15'),
});
export default async function Page() {
  const store = await cookies();
  const preferences = Preferences.parse({
    explanation: store.get('explanation')?.value,
    daily: store.get('daily')?.value,
  });
  const user = await currentUser();
  const account = user && process.env.DATABASE_URL ? await loadPreferences(user.id) : undefined;
  return (
    <Settings
      preferences={preferences}
      signedIn={Boolean(account)}
      weeklyGoal={account?.weeklyGoal}
    />
  );
}
