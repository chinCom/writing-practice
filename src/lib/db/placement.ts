import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { withUserDatabase } from './client';
import { placementResults } from './schema';
import { placementOutput, type CurriculumLevel, type PlacementResult } from '@/lib/curriculum';
import { DomainError } from '@/lib/domain-error';

export async function reservePlacement(userId: string) {
  return withUserDatabase(userId, async (database) => {
    await database.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 3))`);
    const [previous] = await database.select().from(placementResults);
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (previous?.status === 'pending' && now.getTime() - previous.startedAt.getTime() < 60000)
      throw new DomainError('PLACEMENT_PENDING');
    const calls = previous?.callDay === today ? previous.callsToday : 0;
    if (calls >= 3) throw new DomainError('PLACEMENT_LIMIT');
    await database
      .insert(placementResults)
      .values({
        userId,
        status: 'pending',
        callsToday: calls + 1,
        callDay: today,
        startedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: placementResults.userId,
        set: {
          status: 'pending',
          callsToday: calls + 1,
          callDay: today,
          startedAt: now,
          updatedAt: now,
        },
      });
  });
}
export async function completePlacement(userId: string, result: PlacementResult) {
  return withUserDatabase(userId, async (database) => {
    await database
      .update(placementResults)
      .set({ status: 'completed', result: placementOutput.parse(result), updatedAt: new Date() })
      .where(eq(placementResults.userId, userId));
  });
}
export async function failPlacement(userId: string) {
  return withUserDatabase(userId, async (database) => {
    await database
      .update(placementResults)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(eq(placementResults.userId, userId));
  });
}
export async function choosePlacement(userId: string, level: CurriculumLevel) {
  return withUserDatabase(userId, async (database) => {
    const [result] = await database.select().from(placementResults);
    if (result?.status !== 'completed' || !result.result || result.result.safety_flag)
      throw new DomainError('PLACEMENT_REQUIRED');
    await database
      .update(placementResults)
      .set({ chosenLevel: level, updatedAt: new Date() })
      .where(and(eq(placementResults.userId, userId), eq(placementResults.status, 'completed')));
    return { chosenLevel: level };
  });
}
