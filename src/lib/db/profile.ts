import 'server-only';
import { eq } from 'drizzle-orm';
import { withUserDatabase } from './client';
import { profiles } from './schema';
import { profileInput, type LearningProfile } from '@/lib/profile';
export async function loadProfile(userId: string): Promise<LearningProfile | null> {
  return withUserDatabase(userId, async (database) => {
    const [row] = await database.select().from(profiles).where(eq(profiles.userId, userId));
    return row
      ? profileInput.parse({
          nativeLanguage: row.nativeLanguage,
          goal: row.goal,
          startingLevel: row.startingLevel,
          dailyMinutes: row.dailyMinutes,
        })
      : null;
  });
}
export async function saveProfile(userId: string, profile: LearningProfile) {
  return withUserDatabase(userId, async (database) => {
    await database
      .insert(profiles)
      .values({ userId, ...profile })
      .onConflictDoUpdate({ target: profiles.userId, set: { ...profile, updatedAt: new Date() } });
  });
}
