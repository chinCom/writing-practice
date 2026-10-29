import { cookies } from 'next/headers';
import { z } from 'zod';
import Settings from '@/components/layout/Settings';
import { currentUser } from '@/lib/auth/server';
import { loadPreferences } from '@/lib/db/preferences';
import { pageMetadata } from '@/lib/i18n/metadata';
const Preferences = z.object({
  explanation: z.enum(['es', 'en', 'vi']).catch('en'),
  daily: z.enum(['5', '15', '30']).catch('15'),
});
export function generateMetadata() {
  return pageMetadata('settings');
}
export default async function Page() {
  // The cookie read and the session check do not depend on each other.
  const [store, user] = await Promise.all([cookies(), currentUser()]);
  const preferences = Preferences.parse({
    explanation: store.get('explanation')?.value,
    daily: store.get('daily')?.value,
  });
  const account = user && process.env.DATABASE_URL ? await loadPreferences(user.id) : undefined;
  return (
    <Settings
      preferences={preferences}
      signedIn={Boolean(account)}
      weeklyGoal={account?.weeklyGoal}
    />
  );
}
