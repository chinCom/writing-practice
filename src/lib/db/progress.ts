import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { withUserDatabase, type Transaction } from './client';
import { submissions, feedbackRows, practiceAnswers, practiceDrills } from './schema';
import { coursePathsInTransaction } from './curriculum';
import { summarizeProgress, type ProgressSummary } from '@/lib/progress';
import { summarizeImprovement, type Improvement } from '@/lib/improvement';
import { summarizeCourse, type CourseProgress } from '@/lib/course-progress';
import { targetsInTransaction } from './targets';
import { growthTargetsEnabled, visibleFeedback } from '@/lib/targets';
import type { TargetProgress } from '@/lib/target-progress';
import { summarizeBenchmarks } from '@/lib/benchmarks';
import { traceOperation } from '@/lib/observability/server';
import { goalFromPaths, type GoalAttempt, type GoalSummary } from '@/lib/goal';
import { profileInTransaction } from './profile';
import { preferencesInTransaction } from './preferences';

export type ProgressReport = ProgressSummary & {
  improvement: Improvement;
  benchmarks: ReturnType<typeof summarizeBenchmarks>;
};
export type ProgressPageData = ProgressReport & {
  course: { core: CourseProgress; ielts: CourseProgress };
  targets: TargetProgress[];
  goal: GoalSummary;
};
/** The report the page shows, plus first-attempt scores that stay on the server for the goal. */
export type ProgressHistory = { report: ProgressReport; attempts: GoalAttempt[] };

export function loadProgress(userId: string): Promise<ProgressPageData> {
  return withUserDatabase(userId, async (database) => {
    const now = new Date();
    const { report, attempts } = await traceOperation('progress.history', () =>
      progressHistoryInTransaction(database, now),
    );
    const [{ core, ielts }, profile, preferences] = await Promise.all([
      traceOperation('progress.courses', () => coursePathsInTransaction(database)),
      profileInTransaction(database, userId),
      preferencesInTransaction(database, userId),
    ]);
    return {
      ...report,
      goal: goalFromPaths({
        profile,
        paths: { core, ielts },
        attempts,
        weeklyGoal: preferences.weeklyGoal,
        weeklySessions: report.weeklySessions,
        now,
      }),
      targets: growthTargetsEnabled()
        ? await traceOperation('progress.targets', () => targetsInTransaction(database, now))
        : [],
      course: {
        core: summarizeCourse(core.units, 'core', now),
        ielts: summarizeCourse(ielts.units, 'ielts', now),
      },
    };
  });
}
export async function progressHistoryInTransaction(
  database: Transaction,
  now = new Date(),
): Promise<ProgressHistory> {
  const writingQuery = database
    .select({
      id: submissions.id,
      taskId: submissions.taskId,
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
  const practiceQuery = database
    .select({
      at: practiceAnswers.createdAt,
      result: practiceAnswers.result,
      payload: practiceDrills.payload,
    })
    .from(practiceAnswers)
    .innerJoin(practiceDrills, eq(practiceAnswers.drillId, practiceDrills.id));
  const [writing, practice] = await Promise.all([writingQuery, practiceQuery]);
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
        targets: visibleFeedback(row.feedback).target_report,
      })),
  );
  return {
    report: { ...summary, improvement, benchmarks },
    attempts: writing.map((row) => ({
      at: row.at.toISOString(),
      taskId: row.taskId,
      attempt: row.attempt,
      scores: row.feedback.scores,
    })),
  };
}
