import { expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import review from '../curriculum/growth.review.json';
import draft from '../curriculum/growth.draft.json';
import { curriculumSchema } from '@/lib/curriculum';
import { modelWords } from '@/lib/noticing';
import { targetsForUnit } from '@/lib/targets';
it('blocks growth publication before opening a database connection without exact human approval', () => {
  expect(() =>
    execFileSync(process.execPath, ['--import', 'tsx', 'scripts/seed-curriculum.ts'], {
      env: { ...process.env, GROWTH_CONTENT: 'true', DATABASE_URL: '' },
      stdio: 'pipe',
    }),
  ).toThrow(/The review must approve this exact content hash and name a human reviewer/);
});
it('keeps the unapproved review tied to the formatted draft bytes', () => {
  const hash = createHash('sha256')
    .update(readFileSync('curriculum/growth.draft.json'))
    .digest('hex');
  expect(review.approved).toBe(false);
  expect(review.reviewer).toBe('');
  expect(review.contentHash).toBe(hash);
});
it('provides 21 review-gated Core units with word-selectable noticing, transfer sets and matched checkpoints', () => {
  const units = curriculumSchema.parse(draft);
  expect(units).toHaveLength(21);
  for (const unit of units) {
    const first = unit.lessons[0];
    expect(first.noticing?.spans.length).toBeGreaterThanOrEqual(2);
    const words = modelWords(first.miniLesson.modelText);
    for (const span of first.noticing!.spans)
      expect(words.some((word) => word.start === span.start && word.end === span.end)).toBe(true);
    for (const tag of targetsForUnit(unit))
      expect(unit.transferDrills?.filter((item) => item.tag === tag).length).toBeGreaterThanOrEqual(
        4,
      );
    expect(unit.parallelPrompt?.prompt).not.toContain(first.task.prompt);
    expect(unit.parallelPrompt?.genre).toBe(first.task.genre);
    expect(unit.parallelPrompt?.minWords).toBe(first.task.minWords);
    expect(unit.parallelPrompt?.targetLevel).toBe(unit.level);
    expect(unit.parallelPrompt?.isCheckpoint).toBe(true);
  }
  expect(
    units.filter((unit) => unit.lessons.some((lesson) => lesson.task.reading?.mode === 'summary'))
      .length,
  ).toBeGreaterThan(0);
  expect(
    units.filter((unit) =>
      unit.lessons.some((lesson) => lesson.task.reading?.mode === 'continuation'),
    ).length,
  ).toBeGreaterThan(0);
});
