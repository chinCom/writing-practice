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

export async function loadDraft(userId: string) {
  return withUserDatabase(
    userId,
    async (database) =>
      (await database.select().from(drafts).where(eq(drafts.taskId, 'weekend')))[0]?.text ?? '',
  );
}
export async function saveDraft(userId: string, text: string) {
  return withUserDatabase(userId, async (database) => {
    await database
      .insert(drafts)
      .values({ userId, taskId: 'weekend', text })
      .onConflictDoUpdate({
        target: [drafts.userId, drafts.taskId],
        set: { text, updatedAt: new Date() },
      });
  });
}
export async function reserveSubmission(userId: string, input: FeedbackInput) {
  return withUserDatabase(userId, async (database) => {
    // Serialize reservations across tabs and server instances. Pending calls consume quota too.
    await database.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`);
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
    await database
      .update(submissions)
      .set({ status: 'completed' })
      .where(eq(submissions.id, submissionId));
  });
}
export async function failSubmission(userId: string, submissionId: string) {
  return withUserDatabase(userId, async (database) => {
    await database
      .update(submissions)
      .set({ status: 'failed' })
      .where(eq(submissions.id, submissionId));
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
