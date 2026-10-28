import 'server-only';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { withUserDatabase, type Transaction } from './client';
import {
  aiUsage,
  curriculumUnits,
  drafts,
  feedbackRows,
  submissions,
  targetEvidence,
  targetAssistance,
} from './schema';
import { validateTargetReport } from '@/lib/targets';
import { trustedTargetsInTransaction } from './targets';
import { correctionChoicesInTransaction, revisionSubmittedInTransaction } from './corrections';
import { assessMastery } from '@/lib/mastery';
import { benchmarkContextForTask } from '@/lib/benchmarks';
import { countWords } from '@/lib/draft';
import { freeDailySubmissions } from '@/lib/limits';
import { seedSubmissionPractice } from './practice';
import type { FeedbackInput } from '@/lib/feedback/input';
import type { Feedback, LocatedFeedback } from '@/lib/feedback/schema';
import { feedbackPromptVersion } from '@/lib/prompts/version';
import type { AiResult } from '@/lib/ai-result';

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
async function expireChecks(database: Transaction) {
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
    const [revisionParent] = input.parentSubmissionId
      ? await database
          .select()
          .from(submissions)
          .where(eq(submissions.id, input.parentSubmissionId))
      : [];
    const assistance = input.parentSubmissionId
      ? await database
          .select()
          .from(targetAssistance)
          .where(eq(targetAssistance.submissionId, input.parentSubmissionId))
      : [];
    const revisionKind = input.parentSubmissionId
      ? assistance.length > 0 || revisionParent?.revisionKind === 'assisted'
        ? ('assisted' as const)
        : ('self' as const)
      : null;
    const units = await database.select().from(curriculumUnits);
    const reviewed = units.find((unit) =>
      unit.content.lessons.some((lesson) => lesson.task.id === input.taskId),
    );
    const benchmarkContext = reviewed
      ? benchmarkContextForTask(reviewed.content, reviewed.contentHash, input.taskId)
      : null;
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
        revisionKind,
        benchmarkContext,
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
  result: AiResult<Feedback>,
) {
  return withUserDatabase(userId, async (database) => {
    const updated = await database
      .update(submissions)
      .set({ status: 'completed' })
      .where(and(eq(submissions.id, submissionId), eq(submissions.status, 'pending')))
      .returning({ id: submissions.id });
    if (updated.length !== 1) throw new Error('CHECK_EXPIRED');
    const [source] = await database
      .select({
        text: submissions.text,
        taskId: submissions.taskId,
        attempt: submissions.attempt,
        benchmarkContext: submissions.benchmarkContext,
      })
      .from(submissions)
      .where(eq(submissions.id, submissionId));
    const units = await database.select({ content: curriculumUnits.content }).from(curriculumUnits);
    const unit = units.find(({ content }) =>
      content.lessons.some((lesson) => lesson.task.id === source.taskId),
    )?.content;
    const targets = unit ? await trustedTargetsInTransaction(database, unit) : [];
    feedback = validateTargetReport(feedback, targets);
    await database.insert(feedbackRows).values({
      userId,
      submissionId,
      json: feedback,
      model: result.model,
      promptVersion: feedbackPromptVersion,
    });
    if (unit && feedback.target_report?.length) {
      await database.insert(targetEvidence).values(
        feedback.target_report.map((item) => ({
          userId,
          submissionId,
          tag: item.tag,
          level: unit.level,
          uses: item.uses,
          errors: item.errors,
          isFirstAttempt: source.attempt === 1,
          isBenchmark:
            source.attempt === 1 && source.benchmarkContext?.role === 'checkpoint' && !result.mock,
          graderVersion: `${result.model}:${feedbackPromptVersion}`,
        })),
      );
    }
    if (unit && !unit.id.startsWith('ielts-')) {
      const original =
        source.attempt > 1 ? await originalFeedbackInTransaction(database, submissionId) : null;
      const masteryAdvisory = assessMastery({
        targets,
        feedback,
        attempt: source.attempt,
        isCheckpoint: unit.lessons.find((lesson) => lesson.task.id === source.taskId)!.task
          .isCheckpoint,
        baseline: original?.json.target_report,
      });
      await database
        .update(submissions)
        .set({ masteryAdvisory })
        .where(eq(submissions.id, submissionId));
    }
    await seedSubmissionPractice(database, userId, {
      id: submissionId,
      text: source.text,
      feedback,
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
  return withUserDatabase(userId, (database) => feedbackInTransaction(database, submissionId));
}

async function feedbackInTransaction(database: Transaction, submissionId: string) {
  return (
    (
      await database
        .select({ submission: submissions, feedback: feedbackRows })
        .from(submissions)
        .innerJoin(feedbackRows, eq(submissions.id, feedbackRows.submissionId))
        .where(eq(submissions.id, submissionId))
    )[0] ?? null
  );
}

// The feedback page owns one slot: its independent reads are pipelined in a single transaction
// instead of queueing behind each other's cold connections.
export function loadFeedbackReview(userId: string, submissionId: string) {
  return withUserDatabase(userId, async (database) => {
    const [result, original, revisionSubmitted] = await Promise.all([
      feedbackInTransaction(database, submissionId),
      originalFeedbackInTransaction(database, submissionId),
      revisionSubmittedInTransaction(database, submissionId),
    ]);
    const choices = result?.feedback.json.safety_flag
      ? []
      : await correctionChoicesInTransaction(
          database,
          submissionId,
          result?.feedback.json.corrections.length ?? 0,
        );
    return { result, original, revisionSubmitted, choices };
  });
}
async function originalFeedbackInTransaction(database: Transaction, submissionId: string) {
  let id = submissionId;
  for (let depth = 0; depth < 20; depth++) {
    const [row] = await database.select().from(submissions).where(eq(submissions.id, id));
    if (!row) return null;
    if (!row.parentSubmissionId) {
      return (
        (await database.select().from(feedbackRows).where(eq(feedbackRows.submissionId, id)))[0] ??
        null
      );
    }
    id = row.parentSubmissionId;
  }
  return null;
}
export function recentSubmissions(userId: string) {
  return withUserDatabase(userId, recentSubmissionsInTransaction);
}
export function recentSubmissionsInTransaction(database: Transaction) {
  return database
    .select({
      id: submissions.id,
      createdAt: submissions.createdAt,
      wordCount: submissions.wordCount,
      attempt: submissions.attempt,
      taskId: submissions.taskId,
    })
    .from(submissions)
    .where(eq(submissions.status, 'completed'))
    .orderBy(desc(submissions.createdAt))
    .limit(5);
}
