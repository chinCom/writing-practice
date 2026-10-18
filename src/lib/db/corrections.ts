import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { withUserDatabase, type Transaction } from './client';
import {
  correctionChoices,
  correctionReports,
  feedbackRows,
  submissions,
  targetAssistance,
} from './schema';
import { DomainError } from '@/lib/domain-error';
import { targetCorrectionIndexes } from '@/lib/revision';
import type { CorrectionChoice, CorrectionStatus, ReportReason } from '@/lib/feedback/choices';

async function savedFeedback(database: Transaction, submissionId: string, index?: number) {
  const [row] = await database
    .select()
    .from(feedbackRows)
    .where(eq(feedbackRows.submissionId, submissionId));
  if (!row || row.json.safety_flag || (index !== undefined && !row.json.corrections[index]))
    throw new Error('NOT_FOUND');
  return row;
}
export async function loadCorrectionChoices(
  userId: string,
  submissionId: string,
): Promise<CorrectionChoice[]> {
  return withUserDatabase(userId, async (database) => {
    const row = await savedFeedback(database, submissionId);
    const choices = await database
      .select()
      .from(correctionChoices)
      .where(eq(correctionChoices.submissionId, submissionId));
    const assistance = await database
      .select()
      .from(targetAssistance)
      .where(eq(targetAssistance.submissionId, submissionId));
    const reports = await database
      .select()
      .from(correctionReports)
      .where(eq(correctionReports.submissionId, submissionId));
    return row.json.corrections.map((_, correctionIndex) => ({
      correctionIndex,
      status:
        choices.find((choice) => choice.correctionIndex === correctionIndex)?.status ?? 'open',
      reason: reports.find((report) => report.correctionIndex === correctionIndex)?.reason ?? null,
      ...(assistance.some((item) => item.correctionIndex === correctionIndex)
        ? { revealed: true }
        : {}),
    }));
  });
}
export async function saveCorrectionChoice(
  userId: string,
  submissionId: string,
  correctionIndex: number,
  status: CorrectionStatus,
) {
  return withUserDatabase(userId, async (database) => {
    await database.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`);
    const row = await savedFeedback(database, submissionId, correctionIndex);
    if (status === 'applied' && targetCorrectionIndexes(row.json).has(correctionIndex)) {
      await assertAnswerAvailable(database, submissionId, correctionIndex);
      await database
        .insert(targetAssistance)
        .values({ userId, submissionId, correctionIndex })
        .onConflictDoNothing();
    }
    await database
      .insert(correctionChoices)
      .values({ userId, submissionId, correctionIndex, status })
      .onConflictDoUpdate({
        target: [correctionChoices.submissionId, correctionChoices.correctionIndex],
        set: { status, updatedAt: new Date() },
      });
  });
}
export async function reportCorrection(
  userId: string,
  submissionId: string,
  correctionIndex: number,
  reason: ReportReason,
) {
  return withUserDatabase(userId, async (database) => {
    await savedFeedback(database, submissionId, correctionIndex);
    await database
      .insert(correctionReports)
      .values({ userId, submissionId, correctionIndex, reason })
      .onConflictDoUpdate({
        target: [correctionReports.submissionId, correctionReports.correctionIndex],
        set: { reason, updatedAt: new Date() },
      });
  });
}

async function assertAnswerAvailable(
  database: Transaction,
  submissionId: string,
  correctionIndex: number,
) {
  const [source] = await database
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId));
  if (source?.attempt > 1) return;
  const children = await database
    .select()
    .from(submissions)
    .where(eq(submissions.parentSubmissionId, submissionId));
  if (children.some((item) => item.status === 'completed')) return;
  const assistance = await database
    .select()
    .from(targetAssistance)
    .where(eq(targetAssistance.submissionId, submissionId));
  if (assistance.some((item) => item.correctionIndex === correctionIndex)) return;
  throw new DomainError('ANSWER_HIDDEN');
}
export async function requireCorrectionAnswer(
  userId: string,
  submissionId: string,
  correctionIndex: number,
) {
  return withUserDatabase(userId, async (database) => {
    const row = await savedFeedback(database, submissionId, correctionIndex);
    if (targetCorrectionIndexes(row.json).has(correctionIndex))
      await assertAnswerAvailable(database, submissionId, correctionIndex);
  });
}
export async function revealCorrection(
  userId: string,
  submissionId: string,
  correctionIndex: number,
) {
  return withUserDatabase(userId, async (database) => {
    await database.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`);
    const row = await savedFeedback(database, submissionId, correctionIndex);
    if (!targetCorrectionIndexes(row.json).has(correctionIndex)) throw new Error('NOT_FOUND');
    await database
      .insert(targetAssistance)
      .values({ userId, submissionId, correctionIndex })
      .onConflictDoNothing();
  });
}
export async function hasSubmittedRevision(userId: string, submissionId: string) {
  return withUserDatabase(userId, async (database) => {
    const children = await database
      .select()
      .from(submissions)
      .where(eq(submissions.parentSubmissionId, submissionId));
    return children.some((item) => item.status === 'completed');
  });
}
