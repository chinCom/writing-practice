import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { withUserDatabase, type Transaction } from './client';
import { submissions, feedbackRows, practiceAnswers, practiceDrills } from './schema';
import { pathInTransaction } from './curriculum';
import { summarizeProgress, type ProgressSummary } from '@/lib/progress';
import { summarizeImprovement, type Improvement } from '@/lib/improvement';
import { summarizeCourse, type CourseProgress } from '@/lib/course-progress';
import { targetsInTransaction } from './targets';
import type { TargetProgress } from '@/lib/target-progress';
import { summarizeBenchmarks } from '@/lib/benchmarks';

export type ProgressReport = ProgressSummary & {
  improvement: Improvement;
  benchmarks: ReturnType<typeof summarizeBenchmarks>;
};
export type ProgressPageData = ProgressReport & {
  course: { core: CourseProgress; ielts: CourseProgress };
  targets: TargetProgress[];
};

export function loadProgress(userId: string): Promise<ProgressPageData> {
  return withUserDatabase(userId, async (database) => {
    const now = new Date();
    const report = await progressInTransaction(database, now);
    const core = await pathInTransaction(database, 'core');
    const ielts = await pathInTransaction(database, 'ielts');
    return {
      ...report,
      targets: await targetsInTransaction(database, now),
      course: {
        core: summarizeCourse(core.units, 'core', now),
        ielts: summarizeCourse(ielts.units, 'ielts', now),
      },
    };
  });
}
export async function progressInTransaction(
  database: Transaction,
  now = new Date(),
): Promise<ProgressReport> {
  const writing = await database
    .select({
      id: submissions.id,
      text: submissions.text,
      context: submissions.benchmarkContext,
      model: feedbackRows.model,
      promptVersion: feedbackRows.promptVersion,
      at: submissions.createdAt,
      words: submissions.wordCount,
      attempt: submissions.attempt,
      parentId: submissions.parentSubmissionId,
      feedback: feedbackRows.json,
    })
    .from(submissions)
    .innerJoin(feedbackRows, eq(submissions.id, feedbackRows.submissionId))
    .where(
      and(eq(submissions.status, 'completed'), sql`${feedbackRows.json}->>'safety_flag' = 'false'`),
    );
  const practice = await database
    .select({
      at: practiceAnswers.createdAt,
      result: practiceAnswers.result,
      payload: practiceDrills.payload,
    })
    .from(practiceAnswers)
    .innerJoin(practiceDrills, eq(practiceAnswers.drillId, practiceDrills.id));
  const summary = summarizeProgress(
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
    now,
  );
  const improvement = summarizeImprovement(
    writing.map((row) => ({
      id: row.id,
      at: row.at.toISOString(),
      attempt: row.attempt,
      parentId: row.parentId,
      words: row.words,
      scores: row.feedback.scores,
      corrections: row.feedback.corrections,
    })),
    now,
  );
  const benchmarks = summarizeBenchmarks(
    writing
      .filter((row) => row.model !== 'mock')
      .map((row) => ({
        id: row.id,
        at: row.at.toISOString(),
        attempt: row.attempt,
        safety: row.feedback.safety_flag,
        version: row.model + ':' + row.promptVersion,
        context: row.context,
        text: row.text,
        scores: row.feedback.scores,
        targets: row.feedback.target_report,
      })),
  );
  return { ...summary, improvement, benchmarks };
}
