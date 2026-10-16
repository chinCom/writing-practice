import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import type { Transaction } from './client';
import { submissions, feedbackRows, targetEvidence } from './schema';
import { summarizeTargets, reviewTargets } from '@/lib/target-progress';
import { targetsForUnit } from '@/lib/targets';
import type { CurriculumUnit } from '@/lib/curriculum';

export async function targetsInTransaction(database: Transaction, now = new Date()) {
  const rows = await database
    .select({
      submissionId: submissions.id,
      taskId: submissions.taskId,
      at: submissions.createdAt,
      tag: targetEvidence.tag,
      level: targetEvidence.level,
      uses: targetEvidence.uses,
      errors: targetEvidence.errors,
      isFirstAttempt: targetEvidence.isFirstAttempt,
      graderVersion: targetEvidence.graderVersion,
    })
    .from(targetEvidence)
    .innerJoin(submissions, eq(submissions.id, targetEvidence.submissionId))
    .innerJoin(feedbackRows, eq(submissions.id, feedbackRows.submissionId))
    .where(
      and(
        eq(submissions.status, 'completed'),
        eq(submissions.attempt, 1),
        eq(targetEvidence.isFirstAttempt, true),
        sql`${feedbackRows.json}->>'safety_flag' = 'false'`,
      ),
    );
  return summarizeTargets(
    rows.map((row) => ({ ...row, at: row.at.toISOString() })),
    now,
  );
}

export async function trustedTargetsInTransaction(
  database: Transaction,
  unit: Pick<CurriculumUnit, 'id' | 'level' | 'grammarFocus'>,
) {
  const focus = targetsForUnit(unit);
  if (unit.id.startsWith('ielts-') || focus.length === 2) return focus;
  return reviewTargets(focus, unit.level, await targetsInTransaction(database));
}
