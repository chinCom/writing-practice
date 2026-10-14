import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { withUserDatabase } from './client';
import { correctionChoices, correctionReports, feedbackRows } from './schema';
import type { CorrectionChoice, CorrectionStatus, ReportReason } from '@/lib/feedback/choices';

type Database = Parameters<Parameters<typeof withUserDatabase>[1]>[0];
async function savedFeedback(database: Database, submissionId: string, index?: number) {
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
    const reports = await database
      .select()
      .from(correctionReports)
      .where(eq(correctionReports.submissionId, submissionId));
    return row.json.corrections.map((_, correctionIndex) => ({
      correctionIndex,
      status:
        choices.find((choice) => choice.correctionIndex === correctionIndex)?.status ?? 'open',
      reason: reports.find((report) => report.correctionIndex === correctionIndex)?.reason ?? null,
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
    await savedFeedback(database, submissionId, correctionIndex);
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
