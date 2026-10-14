import 'server-only';
import { eq } from 'drizzle-orm';
import { withUserDatabase } from './client';
import { preferences } from './schema';
import { weeklyGoalSchema, type WeeklyGoal } from '@/lib/preferences';
export function loadPreferences(userId: string) {
  return withUserDatabase(userId, async (database) => {
    const [row] = await database.select().from(preferences).where(eq(preferences.userId, userId));
    return { weeklyGoal: weeklyGoalSchema.parse(row?.weeklyGoal ?? 5) };
  });
}
export function savePreferences(userId: string, weeklyGoal: WeeklyGoal) {
  return withUserDatabase(userId, async (database) => {
    await database
      .insert(preferences)
      .values({ userId, weeklyGoal })
      .onConflictDoUpdate({
        target: preferences.userId,
        set: { weeklyGoal, updatedAt: new Date() },
      });
  });
}
