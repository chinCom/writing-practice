import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { withUserDatabase } from './client';
import {
  aiUsage,
  explanationRequests,
  explanationRows,
  placementResults,
  profiles,
} from './schema';
import { curriculumLevel, type CurriculumLevel } from '@/lib/curriculum';
import { explanationPromptVersion, type Explanation } from '@/lib/feedback/explanation';
import type { AiResult } from '@/lib/ai-result';

function identity(submissionId: string, correctionIndex: number) {
  return and(
    eq(explanationRows.submissionId, submissionId),
    eq(explanationRows.correctionIndex, correctionIndex),
    eq(explanationRows.promptVersion, explanationPromptVersion),
  );
}
export async function reserveExplanation(
  userId: string,
  submissionId: string,
  correctionIndex: number,
) {
  return withUserDatabase(userId, async (database) => {
    await database.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`);
    const [existing] = await database
      .select()
      .from(explanationRows)
      .where(identity(submissionId, correctionIndex));
    if (existing?.status === 'completed') return { kind: 'completed' as const, row: existing };
    if (existing?.status === 'pending' && Date.now() - existing.updatedAt.getTime() < 30000)
      return { kind: 'pending' as const };
    const [count] = await database
      .select({ total: sql<number>`count(*)::int` })
      .from(explanationRequests)
      .where(
        sql`${explanationRequests.createdAt} >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`,
      );
    if (count.total >= 60) throw new Error('EXPLANATION_LIMIT');
    const requestKey = randomUUID();
    await database.insert(explanationRequests).values({ id: requestKey, userId });
    await database
      .insert(explanationRows)
      .values({
        submissionId,
        userId,
        correctionIndex,
        promptVersion: explanationPromptVersion,
        requestKey,
        status: 'pending',
      })
      .onConflictDoUpdate({
        target: [
          explanationRows.submissionId,
          explanationRows.correctionIndex,
          explanationRows.promptVersion,
        ],
        set: { status: 'pending', requestKey, updatedAt: new Date() },
      });
    return { kind: 'claimed' as const, requestKey };
  });
}
// Development uses the same owner lock and request ledger as new explanations.
// Only a request count is stored; the short draft and guidance are not persisted.
export async function reserveDevelopment(userId: string, fallback: CurriculumLevel) {
  return withUserDatabase(userId, async (database) => {
    await database.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`);
    const [count] = await database
      .select({ total: sql<number>`count(*)::int` })
      .from(explanationRequests)
      .where(
        sql`${explanationRequests.createdAt} >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`,
      );
    if (count.total >= 60) throw new Error('EXPLANATION_LIMIT');
    const [placement] = await database
      .select({ level: placementResults.chosenLevel })
      .from(placementResults);
    const [profile] = await database.select({ level: profiles.startingLevel }).from(profiles);
    const chosen = curriculumLevel.safeParse(placement?.level ?? profile?.level);
    await database.insert(explanationRequests).values({ id: randomUUID(), userId });
    return { level: chosen.success ? chosen.data : fallback };
  });
}
export async function finishExplanation(
  userId: string,
  requestKey: string,
  result: AiResult<Explanation>,
) {
  return withUserDatabase(userId, async (database) => {
    const [row] = await database
      .update(explanationRows)
      .set({ status: 'completed', json: result.data, mock: result.mock, updatedAt: new Date() })
      .where(and(eq(explanationRows.requestKey, requestKey), eq(explanationRows.status, 'pending')))
      .returning();
    if (!row) throw new Error('EXPLANATION_EXPIRED');
    await database.insert(aiUsage).values({
      userId,
      submissionId: row.submissionId,
      model: result.model,
      ...result.usage,
      latencyMs: result.latencyMs,
      mock: result.mock,
    });
  });
}
export async function failExplanation(userId: string, requestKey: string) {
  return withUserDatabase(userId, async (database) => {
    await database
      .update(explanationRows)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(
        and(eq(explanationRows.requestKey, requestKey), eq(explanationRows.status, 'pending')),
      );
  });
}
