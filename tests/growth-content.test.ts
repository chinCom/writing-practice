import { expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import review from '../curriculum/growth.review.json';
import draft from '../curriculum/growth.draft.json';
import course from '../curriculum/course.draft.json';
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

const readingBands: Record<string, [number, number]> = {
  B1: [150, 220],
  B2: [250, 350],
  C1: [350, 500],
  C2: [350, 500],
};
const parsed = curriculumSchema.parse(draft);
function withoutReading(task: object) {
  return Object.fromEntries(Object.entries(task).filter(([key]) => key !== 'reading'));
}
function readingTasks() {
  return parsed.flatMap((unit) =>
    unit.lessons.flatMap((lesson) =>
      lesson.task.reading ? [{ level: unit.level, reading: lesson.task.reading }] : [],
    ),
  );
}

it('keeps transfer prompts unique across the whole file with short plain rules', () => {
  const items = parsed.flatMap((unit) => unit.transferDrills ?? []);
  expect(new Set(items.map((item) => item.prompt)).size).toBe(items.length);
  for (const item of items) {
    expect(item.explanation).not.toContain('Compare your answer');
    expect(item.explanation.split(/\s+/).length).toBeLessThanOrEqual(20);
  }
});

it('keeps every reading task prompt and fields identical to the Core draft', () => {
  const readingCount = parsed.flatMap((unit, unitIndex) =>
    unit.lessons.flatMap((lesson, lessonIndex) => {
      if (!lesson.task.reading) return [];
      const original = course[unitIndex].lessons[lessonIndex].task;
      expect(withoutReading(lesson.task)).toEqual(withoutReading(original));
      return [lesson.task.id];
    }),
  );
  expect(readingCount).toHaveLength(12);
});

it('gives each reading its own text inside the level word band with a read-to-write instruction', () => {
  const readings = readingTasks();
  expect(readings).toHaveLength(12);
  expect(new Set(readings.map(({ reading }) => reading.text)).size).toBe(readings.length);
  for (const { level, reading } of readings) {
    const [min, max] = readingBands[level];
    const words = reading.text.split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(min);
    expect(words).toBeLessThanOrEqual(max);
    expect(reading.instruction).toBeTruthy();
  }
});

it('asks noticing for every instance of one structure in two to six spans', () => {
  for (const unit of parsed) {
    const noticing = unit.lessons[0].noticing!;
    expect(noticing.instruction).not.toMatch(/first two|occurrence/i);
    expect(noticing.spans.length).toBeGreaterThanOrEqual(2);
    expect(noticing.spans.length).toBeLessThanOrEqual(6);
  }
});

it('keeps the first-words checkpoint in first person, matching its unit-start task', () => {
  const [firstWords] = parsed;
  expect(firstWords.parallelPrompt?.prompt).toContain('your name');
  expect(firstWords.parallelPrompt?.prompt).not.toMatch(/\b(classmate|their)\b/);
});
