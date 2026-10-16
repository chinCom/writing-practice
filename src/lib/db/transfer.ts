import 'server-only';
import { sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { withUserDatabase, type Transaction } from './client';
import { curriculumUnits } from './schema';
import { pathInTransaction } from './curriculum';
import { trustedTargetsInTransaction } from './targets';
import { gradeTransfer, type TransferQuestion, type TransferItem } from '@/lib/transfer';
import { normalizePracticeAnswer } from '@/lib/practice';
import { ApiError } from '@/lib/api';

type Available = { unitId: string; item: TransferItem; hash: string };
async function availableItems(database: Transaction): Promise<Available[]> {
  const path = await pathInTransaction(database);
  const current = path.units.find((unit) =>
    unit.lessons.some((lesson) => lesson.state === 'current'),
  );
  if (!current) return [];
  const units = await database.select().from(curriculumUnits);
  const trusted = units.find((unit) => unit.id === current.id);
  if (!trusted) return [];
  const targets = await trustedTargetsInTransaction(database, trusted.content);
  return (trusted.content.transferDrills ?? [])
    .filter((item) => targets.includes(item.tag))
    .map((item) => ({
      unitId: trusted.id,
      item,
      hash: createHash('sha256').update(JSON.stringify(item)).digest('hex'),
    }));
}
async function schedule(database: Transaction, unitId: string, itemId: string, hash: string) {
  const [row] = await database
    .select({
      version: sql<number>`version`,
      box: sql<number>`box`,
      misses: sql<number>`misses`,
      nextReviewAt: sql<string | Date>`next_review_at`,
    })
    .from(sql`writing.transfer_progress`)
    .where(sql`unit_id=${unitId} AND item_id=${itemId} AND content_hash=${hash}`);
  return row;
}
export function loadTransfer(userId: string) {
  return withUserDatabase(userId, async (database) => {
    const questions: TransferQuestion[] = [];
    let nextReviewAt: string | null = null;
    for (const { unitId, item, hash } of await availableItems(database)) {
      const row = await schedule(database, unitId, item.id, hash);
      const at = row ? new Date(row.nextReviewAt) : new Date(0);
      if (!row || at.getTime() <= Date.now())
        questions.push({
          unitId,
          id: item.id,
          tag: item.tag,
          prompt: item.prompt,
          version: row?.version ?? 0,
        });
      else if (!nextReviewAt || at < new Date(nextReviewAt)) nextReviewAt = at.toISOString();
    }
    return { questions, nextReviewAt };
  });
}
export function answerTransfer(
  userId: string,
  unitId: string,
  itemId: string,
  answer: string,
  version: number,
) {
  return withUserDatabase(userId, async (database) => {
    await database.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 4))`);
    const available = (await availableItems(database)).find(
      (entry) => entry.unitId === unitId && entry.item.id === itemId,
    );
    if (!available) throw new ApiError('NOT_FOUND', 404);
    const { item, hash } = available;
    const normalized = normalizePracticeAnswer(answer);
    const [previous] = await database
      .select({
        answer: sql<string>`answer`,
        result: sql<ReturnType<typeof gradeTransfer> & { version: number }>`result`,
      })
      .from(sql`writing.transfer_answers`)
      .where(
        sql`unit_id=${unitId} AND item_id=${itemId} AND content_hash=${hash} AND version=${version}`,
      );
    if (previous) {
      if (previous.answer !== normalized) throw new ApiError('PRACTICE_CONFLICT', 409);
      return previous.result;
    }
    await database.execute(
      sql`INSERT INTO writing.transfer_progress(user_id,unit_id,item_id,content_hash) VALUES (${userId},${unitId},${itemId},${hash}) ON CONFLICT DO NOTHING`,
    );
    const row = await schedule(database, unitId, itemId, hash);
    if (row.version !== version || new Date(row.nextReviewAt).getTime() > Date.now())
      throw new ApiError('PRACTICE_CONFLICT', 409);
    const result = { ...gradeTransfer(item, answer, row.box, row.misses), version: version + 1 };
    await database.execute(
      sql`INSERT INTO writing.transfer_answers(user_id,unit_id,item_id,content_hash,version,answer,result) VALUES (${userId},${unitId},${itemId},${hash},${version},${normalized},${JSON.stringify(result)}::jsonb)`,
    );
    // Raw SQL parameters bypass Drizzle's timestamp column encoder.
    const nextReviewAt = new Date(
      Date.now() + (result.complete ? result.days * 86400000 : 0),
    ).toISOString();
    await database.execute(
      sql`UPDATE writing.transfer_progress SET version=${result.version},box=${result.box},misses=${result.misses},next_review_at=${nextReviewAt} WHERE user_id=${userId} AND unit_id=${unitId} AND item_id=${itemId} AND content_hash=${hash}`,
    );
    return result;
  });
}
