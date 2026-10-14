import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import postgres from 'postgres';
import { curriculumSchema } from '../src/lib/curriculum';
const source = await readFile('curriculum/a1-b1.draft.json');
const hash = createHash('sha256').update(source).digest('hex');
const review = JSON.parse(
  await readFile('curriculum/review.json', 'utf8').catch(() => {
    throw new Error('Human review is required. See curriculum/README.md.');
  }),
);
if (
  review.approved !== true ||
  review.contentHash !== hash ||
  typeof review.reviewer !== 'string' ||
  !review.reviewer.trim() ||
  !Number.isFinite(Date.parse(review.reviewedAt))
)
  throw new Error('The review must approve this exact content hash and name a human reviewer.');
const units = curriculumSchema.parse(JSON.parse(source.toString()));
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const database = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, connect_timeout: 5 });
try {
  await database.begin(async (transaction) => {
    await transaction`SET LOCAL statement_timeout = '5s'`;
    await transaction`SELECT pg_advisory_xact_lock(20261014)`;
    for (const unit of units) {
      await transaction`INSERT INTO writing.curriculum_units(id,level,sort_order,content,reviewed_by,reviewed_at,content_hash) VALUES (${unit.id},${unit.level},${unit.order},${transaction.json(unit)},${review.reviewer},${review.reviewedAt},${hash}) ON CONFLICT(id) DO UPDATE SET level=EXCLUDED.level,sort_order=EXCLUDED.sort_order,content=EXCLUDED.content,reviewed_by=EXCLUDED.reviewed_by,reviewed_at=EXCLUDED.reviewed_at,content_hash=EXCLUDED.content_hash`;
    }
  });
  console.log('Seeded ' + units.length + ' reviewed curriculum units.');
} finally {
  await database.end();
}
