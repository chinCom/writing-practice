import 'server-only';
import { desc, eq } from 'drizzle-orm';
import { withUserDatabase } from './client';
import { submissions, feedbackRows } from './schema';
import { loadFeedback } from './queries';
import type { WritingVersion, RevisionComparison } from '@/lib/revision';

const fields = {
  id: submissions.id,
  createdAt: submissions.createdAt,
  text: submissions.text,
  wordCount: submissions.wordCount,
  attempt: submissions.attempt,
  parentSubmissionId: submissions.parentSubmissionId,
  json: feedbackRows.json,
};
export async function loadPortfolio(userId: string, offset: number) {
  return withUserDatabase(userId, async (database) => {
    const rows = await database
      .select(fields)
      .from(submissions)
      .innerJoin(feedbackRows, eq(submissions.id, feedbackRows.submissionId))
      .where(eq(submissions.status, 'completed'))
      .orderBy(desc(submissions.createdAt), desc(submissions.id))
      .limit(21)
      .offset(offset);
    return {
      entries: rows.slice(0, 20).map(({ json, createdAt, ...entry }): WritingVersion => ({
        ...entry,
        createdAt: createdAt.toISOString(),
        scores: json.scores,
      })),
      nextOffset: rows.length > 20 ? offset + 20 : null,
    };
  });
}
export async function loadRevision(
  userId: string,
  submissionId: string,
): Promise<RevisionComparison | null> {
  const current = await loadFeedback(userId, submissionId);
  if (
    !current ||
    current.submission.status !== 'completed' ||
    !current.submission.parentSubmissionId
  )
    return null;
  const original = await loadFeedback(userId, current.submission.parentSubmissionId);
  if (
    !original ||
    original.submission.status !== 'completed' ||
    original.submission.taskId !== current.submission.taskId
  )
    return null;
  const version = (row: NonNullable<typeof current>): WritingVersion => ({
    id: row.submission.id,
    createdAt: row.submission.createdAt.toISOString(),
    text: row.submission.text,
    wordCount: row.submission.wordCount,
    attempt: row.submission.attempt,
    parentSubmissionId: row.submission.parentSubmissionId,
    scores: row.feedback.json.scores,
  });
  return { current: version(current), original: version(original) };
}
