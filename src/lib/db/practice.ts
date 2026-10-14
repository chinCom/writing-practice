import 'server-only';
import { hintTerms } from '@/lib/hint-text';
import { and, asc, eq, lte, sql } from 'drizzle-orm';
import { withUserDatabase, type Transaction } from './client';
import {
  feedbackRows,
  practiceAnswers,
  practiceSources,
  practiceDrills,
  submissions,
  correctionChoices,
} from './schema';
import {
  buildPracticeCards,
  checkPracticeAnswer,
  normalizePracticeAnswer,
  practiceRetryHint,
  type PracticeAnswer,
  type PracticeQuestion,
} from '@/lib/practice';

export function loadPractice(userId: string) {
  return withUserDatabase(userId, (database) => practiceInTransaction(database, userId));
}
export async function practiceInTransaction(database: Transaction, userId: string) {
  const [lock] = await database
    .select({ acquired: sql<boolean>`acquired` })
    .from(
      sql`(SELECT pg_try_advisory_xact_lock(hashtextextended(${userId}, 0)) AS acquired) AS practice_lock`,
    );
  // Optional seeding must not block reads behind another learner operation.
  if (lock.acquired) await seedPracticeInTransaction(database, userId);
  return duePracticeInTransaction(database);
}

async function seedPracticeInTransaction(database: Transaction, userId: string) {
  // Bounded legacy backfill. A marker also records sources with no usable drills.
  const sources = await database
    .select({ text: submissions.text, id: submissions.id, feedback: feedbackRows.json })
    .from(submissions)
    .innerJoin(feedbackRows, eq(feedbackRows.submissionId, submissions.id))
    .where(
      and(
        eq(submissions.status, 'completed'),
        sql`NOT EXISTS (SELECT 1 FROM writing.practice_sources s WHERE s.submission_id = ${submissions.id})`,
      ),
    )
    .orderBy(asc(submissions.createdAt), asc(submissions.id))
    .limit(10);
  for (const source of sources) await seedSubmissionPractice(database, userId, source);
}

export async function seedSubmissionPractice(
  database: Transaction,
  userId: string,
  source: { id: string; text: string; feedback: import('@/lib/feedback/schema').LocatedFeedback },
) {
  const marker = await database
    .insert(practiceSources)
    .values({ userId, submissionId: source.id })
    .onConflictDoNothing()
    .returning();
  if (!marker.length) return;
  const cards = source.feedback.safety_flag
    ? []
    : buildPracticeCards(source.text, source.feedback.corrections);
  if (cards.length)
    await database
      .insert(practiceDrills)
      .values(
        cards.map((payload) => ({
          userId,
          submissionId: source.id,
          correctionIndex: payload.correctionIndex,
          payload,
        })),
      )
      .onConflictDoNothing();
}

async function duePracticeInTransaction(database: Transaction) {
  const now = new Date();
  const due = await database
    .select()
    .from(practiceDrills)
    .where(
      and(
        lte(practiceDrills.nextReviewAt, now),
        sql`NOT EXISTS (SELECT 1 FROM writing.correction_choices c WHERE c.submission_id = ${practiceDrills.submissionId} AND c.correction_index = ${practiceDrills.correctionIndex} AND c.status = 'dismissed')`,
      ),
    )
    .orderBy(asc(practiceDrills.nextReviewAt))
    .limit(20);
  const [next] = await database
    .select({ at: sql<Date | null>`min(${practiceDrills.nextReviewAt})` })
    .from(practiceDrills)
    .where(
      sql`NOT EXISTS (SELECT 1 FROM writing.correction_choices c WHERE c.submission_id = ${practiceDrills.submissionId} AND c.correction_index = ${practiceDrills.correctionIndex} AND c.status = 'dismissed')`,
    );
  const questions: PracticeQuestion[] = due.map(({ id, version, payload }) => ({
    id,
    version,
    text: payload.text,
    start: payload.start,
    end: payload.end,
    original: payload.original,
    tag: payload.tag,
  }));
  return { questions, nextReviewAt: next.at ? new Date(next.at).toISOString() : null };
}

export async function answerPractice(
  userId: string,
  drillId: string,
  answer: string,
  version: number,
) {
  return withUserDatabase(userId, async (database) => {
    await database.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`);
    const [drill] = await database
      .select()
      .from(practiceDrills)
      .where(eq(practiceDrills.id, drillId));
    if (!drill) throw new Error('NOT_FOUND');
    const [choice] = await database
      .select()
      .from(correctionChoices)
      .where(
        and(
          eq(correctionChoices.submissionId, drill.submissionId),
          eq(correctionChoices.correctionIndex, drill.correctionIndex),
        ),
      );
    if (choice?.status === 'dismissed') throw new Error('PRACTICE_CONFLICT');
    const normalized = normalizePracticeAnswer(answer);
    const [previous] = await database
      .select()
      .from(practiceAnswers)
      .where(and(eq(practiceAnswers.drillId, drillId), eq(practiceAnswers.version, version)));
    if (previous) {
      if (previous.answer !== normalized) throw new Error('PRACTICE_CONFLICT');
      return {
        ...previous.result,
        hintTerms: hintTerms(drill.payload.explanation, drill.payload.suggestion),
        ...(!previous.result.complete
          ? { retryHint: practiceRetryHint(answer, drill.payload.suggestion) }
          : {}),
      };
    }
    if (drill.version !== version || drill.nextReviewAt.getTime() > Date.now())
      throw new Error('PRACTICE_CONFLICT');
    const result = checkPracticeAnswer(answer, drill.payload.suggestion, drill.box, drill.misses);
    const response: PracticeAnswer = {
      ...result,
      version: version + 1,
      explanation: drill.payload.explanation,
      hintTerms: hintTerms(drill.payload.explanation, drill.payload.suggestion),
      ...(result.complete
        ? { suggestion: drill.payload.suggestion }
        : { retryHint: practiceRetryHint(answer, drill.payload.suggestion) }),
    };
    await database
      .insert(practiceAnswers)
      .values({ drillId, userId, version, answer: normalized, result: response });
    await database
      .update(practiceDrills)
      .set({
        version: version + 1,
        box: result.box,
        misses: result.misses,
        ...(result.complete
          ? {
              nextReviewAt: new Date(Date.now() + result.days * 86400000),
              completedAt: new Date(),
            }
          : {}),
      })
      .where(eq(practiceDrills.id, drillId));
    return response;
  });
}
