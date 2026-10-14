import 'server-only';
import { hintTerms } from '@/lib/hint-text';
import { and, asc, eq, lte, sql } from 'drizzle-orm';
import { withUserDatabase } from './client';
import {
  feedbackRows,
  practiceAnswers,
  practiceDrills,
  submissions,
  correctionChoices,
} from './schema';
import {
  buildPracticeCards,
  checkPracticeAnswer,
  normalizePracticeAnswer,
  type PracticeAnswer,
  type PracticeQuestion,
} from '@/lib/practice';

export async function loadPractice(userId: string) {
  return withUserDatabase(userId, async (database) => {
    await database.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`);
    // Seed once from saved feedback. Do not send model answers to the browser queue.
    const choices = await database.select().from(correctionChoices);
    const sources = await database
      .select({ text: submissions.text, id: submissions.id, feedback: feedbackRows.json })
      .from(submissions)
      .innerJoin(feedbackRows, eq(feedbackRows.submissionId, submissions.id))
      .where(
        and(
          eq(submissions.status, 'completed'),
          sql`${feedbackRows.json}->>'safety_flag' = 'false'`,
        ),
      );
    for (const source of sources) {
      const cards = buildPracticeCards(source.text, source.feedback.corrections).filter(
        (card) =>
          !choices.some(
            (choice) =>
              choice.submissionId === source.id &&
              choice.correctionIndex === card.correctionIndex &&
              choice.status === 'dismissed',
          ),
      );
      if (cards.length) {
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
    }
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
  });
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
      ...(result.complete ? { suggestion: drill.payload.suggestion } : {}),
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
