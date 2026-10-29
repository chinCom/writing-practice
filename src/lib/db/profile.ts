import 'server-only';
import { eq } from 'drizzle-orm';
import { withUserDatabase, type Transaction } from './client';
import { profiles } from './schema';
import { learningProfile, type LearningProfile } from '@/lib/profile';
export async function profileInTransaction(
  database: Transaction,
  userId: string,
): Promise<LearningProfile | null> {
  const [row] = await database.select().from(profiles).where(eq(profiles.userId, userId));
  return row
    ? learningProfile.parse({
        nativeLanguage: row.nativeLanguage,
        goal: row.goal,
        startingLevel: row.startingLevel,
        dailyMinutes: row.dailyMinutes,
        targetLevel: row.targetLevel,
        targetScore: row.targetScore,
        targetDate: row.targetDate,
      })
    : null;
}
export async function loadProfile(userId: string): Promise<LearningProfile | null> {
  return withUserDatabase(userId, (database) => profileInTransaction(database, userId));
}
export async function saveProfile(userId: string, profile: LearningProfile) {
  return withUserDatabase(userId, async (database) => {
    await database
      .insert(profiles)
      .values({ userId, ...profile })
      .onConflictDoUpdate({ target: profiles.userId, set: { ...profile, updatedAt: new Date() } });
  });
}
