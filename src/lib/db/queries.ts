import 'server-only';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { withUserDatabase } from './client';
import { aiUsage, drafts, feedbackRows, submissions } from './schema';
import { countWords } from '@/lib/draft';
import { freeDailySubmissions } from '@/lib/limits';
import type { FeedbackInput } from '@/lib/feedback/input';
import type { LocatedFeedback } from '@/lib/feedback/schema';
import { feedbackPromptVersion } from '@/lib/prompts/version';
import type { gradeWriting } from '@/lib/llm/grade';

export async function loadDraft(userId: string, taskId = 'weekend') {
  return withUserDatabase(
    userId,
    async (database) =>
      (await database.select().from(drafts).where(eq(drafts.taskId, taskId)))[0]?.text ?? '',
  );
}
export async function saveDraft(userId: string, text: string, taskId = 'weekend') {
  return withUserDatabase(userId, async (database) => {
    await database
      .insert(drafts)
      .values({ userId, taskId, text })
      .onConflictDoUpdate({
        target: [drafts.userId, drafts.taskId],
        set: { text, updatedAt: new Date() },
      });
  });
}
async function expireChecks(database: Parameters<Parameters<typeof withUserDatabase>[1]>[0]) {
  await database
    .update(submissions)
    .set({ status: 'failed' })
    .where(
      and(
        eq(submissions.status, 'pending'),
        sql`${submissions.createdAt} < now() - interval '2 minutes'`,
      ),
    );
}
export async function loadCheck(userId: string, requestKey: string) {
  return withUserDatabase(userId, async (database) => {
    await expireChecks(database);
    return (
      (
        await database.select().from(submissions).where(eq(submissions.requestKey, requestKey))
      )[0] ?? null
    );
  });
}
export async function claimSubmission(userId: string, submissionId: string) {
  return withUserDatabase(userId, async (database) => {
    const rows = await database
      .update(submissions)
      .set({ startedAt: new Date() })
      .where(
        and(
          eq(submissions.id, submissionId),
          eq(submissions.status, 'pending'),
          sql`${submissions.startedAt} IS NULL`,
        ),
      )
      .returning({ id: submissions.id });
    return rows.length === 1;
  });
}
export async function reserveSubmission(userId: string, input: FeedbackInput, requestKey?: string) {
  return withUserDatabase(userId, async (database) => {
    // Serialize reservations across tabs and server instances. Pending calls consume quota too.
    await database.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`);
    await expireChecks(database);
    if (requestKey) {
      const [existing] = await database
        .select()
        .from(submissions)
        .where(eq(submissions.requestKey, requestKey));
      if (existing) {
        if (
          existing.text !== input.text ||
          existing.taskId !== input.taskId ||
          existing.attempt !== input.attempt ||
          existing.parentSubmissionId !== (input.parentSubmissionId ?? null)
        )
          throw new Error('CHECK_CONFLICT');
        return existing.id;
      }
      const [active] = await database
        .select({ id: submissions.id })
        .from(submissions)
        .where(and(eq(submissions.status, 'pending'), sql`${submissions.requestKey} IS NOT NULL`))
        .limit(1);
      if (active) throw new Error('CHECK_IN_PROGRESS');
    }
    const day = new Date();
    day.setUTCHours(0, 0, 0, 0);
    const rows = await database
      .select({ id: submissions.id })
      .from(submissions)
      .where(and(eq(submissions.userId, userId), gte(submissions.createdAt, day)));
    if (rows.length >= freeDailySubmissions) throw new Error('DAILY_LIMIT');
    if (input.parentSubmissionId) {
      const [parent] = await database
        .select()
        .from(submissions)
        .where(eq(submissions.id, input.parentSubmissionId));
      if (
        !parent ||
        parent.status !== 'completed' ||
        parent.taskId !== input.taskId ||
        parent.attempt + 1 !== input.attempt
      )
        throw new Error('INVALID_PARENT');
    }
    const [submission] = await database
      .insert(submissions)
      .values({
        userId,
        requestKey,
        taskId: input.taskId,
        text: input.text,
        wordCount: countWords(input.text),
        attempt: input.attempt,
        parentSubmissionId: input.parentSubmissionId,
      })
      .returning();
    await database
      .insert(drafts)
      .values({ userId, taskId: input.taskId, text: input.text })
      .onConflictDoUpdate({
        target: [drafts.userId, drafts.taskId],
        set: { text: input.text, updatedAt: new Date() },
      });
    return submission.id;
  });
}
export async function completeSubmission(
  userId: string,
  submissionId: string,
  feedback: LocatedFeedback,
  result: Awaited<ReturnType<typeof gradeWriting>>,
) {
  return withUserDatabase(userId, async (database) => {
    const updated = await database
      .update(submissions)
      .set({ status: 'completed' })
      .where(and(eq(submissions.id, submissionId), eq(submissions.status, 'pending')))
      .returning({ id: submissions.id });
    if (updated.length !== 1) throw new Error('CHECK_EXPIRED');
    await database.insert(feedbackRows).values({
      userId,
      submissionId,
      json: feedback,
      model: result.model,
      promptVersion: feedbackPromptVersion,
    });
    await database.insert(aiUsage).values({
      userId,
      submissionId,
      model: result.model,
      ...result.usage,
      latencyMs: result.latencyMs,
      mock: result.mock,
    });
  });
}
export async function failSubmission(userId: string, submissionId: string) {
  return withUserDatabase(userId, async (database) => {
    await database
      .update(submissions)
      .set({ status: 'failed' })
      .where(and(eq(submissions.id, submissionId), eq(submissions.status, 'pending')));
  });
}
export async function loadFeedback(userId: string, submissionId: string) {
  return withUserDatabase(
    userId,
    async (database) =>
      (
        await database
          .select({ submission: submissions, feedback: feedbackRows })
          .from(submissions)
          .innerJoin(feedbackRows, eq(submissions.id, feedbackRows.submissionId))
          .where(eq(submissions.id, submissionId))
      )[0] ?? null,
  );
}
export async function recentSubmissions(userId: string) {
  return withUserDatabase(userId, (database) =>
    database
      .select({
        id: submissions.id,
        createdAt: submissions.createdAt,
        wordCount: submissions.wordCount,
        attempt: submissions.attempt,
      })
      .from(submissions)
      .where(eq(submissions.status, 'completed'))
      .orderBy(desc(submissions.createdAt))
      .limit(5),
  );
}
