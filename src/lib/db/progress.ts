import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { withUserDatabase } from './client';
import { submissions, feedbackRows, practiceAnswers, practiceDrills } from './schema';
import { summarizeProgress } from '@/lib/progress';

export async function loadProgress(userId: string) {
  return withUserDatabase(userId, async (database) => {
    const writing = await database
      .select({
        at: submissions.createdAt,
        words: submissions.wordCount,
        feedback: feedbackRows.json,
      })
      .from(submissions)
      .innerJoin(feedbackRows, eq(submissions.id, feedbackRows.submissionId))
      .where(
        and(
          eq(submissions.status, 'completed'),
          sql`${feedbackRows.json}->>'safety_flag' = 'false'`,
        ),
      );
    const practice = await database
      .select({
        at: practiceAnswers.createdAt,
        result: practiceAnswers.result,
        payload: practiceDrills.payload,
      })
      .from(practiceAnswers)
      .innerJoin(practiceDrills, eq(practiceAnswers.drillId, practiceDrills.id));
    return summarizeProgress(
      writing.map((row) => ({
        at: row.at.toISOString(),
        words: row.words,
        level: row.feedback.cefr_estimate,
        corrections: row.feedback.corrections,
      })),
      practice.map((row) => ({
        at: row.at.toISOString(),
        correct: row.result.correct,
        complete: row.result.complete,
        tag: row.payload.tag,
        box: row.result.box,
      })),
    );
  });
}
