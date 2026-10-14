import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import {
  curriculumSchema,
  curriculumLevel,
  placementOutput,
  publicLesson,
  courseRanges,
} from '@/lib/curriculum';
import { parseFeedbackInput } from '@/lib/feedback/input';
it('accepts all selectable levels but keeps the placement estimate bounded to A1–B1', () => {
  expect(curriculumLevel.options).toEqual(['PRE_A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
  expect(
    placementOutput.safeParse({ cefr: 'C2', confidence: 1, reason: 'test', safety_flag: false })
      .success,
  ).toBe(false);
});
it('has 21 original units and 63 unique complete lessons with valid task boundaries', async () => {
  const units = curriculumSchema.parse(
    JSON.parse(await readFile('curriculum/course.draft.json', 'utf8')),
  );
  expect(units).toHaveLength(21);
  for (const level of curriculumLevel.options) {
    const group = units.filter((unit) => unit.level === level);
    expect(group).toHaveLength(3);
    for (const unit of group) {
      expect(unit.lessons).toHaveLength(3);
      for (const lesson of unit.lessons) {
        expect([lesson.task.minWords, lesson.task.maxWords]).toEqual(courseRanges[level]);
        expect(lesson.miniLesson.modelText.trim().split(/\s+/).length).toBeGreaterThanOrEqual(
          courseRanges[level][0],
        );
        expect(lesson.miniLesson.modelText.trim().split(/\s+/).length).toBeLessThanOrEqual(
          courseRanges[level][1],
        );
        expect(JSON.stringify(publicLesson(lesson))).not.toContain('"answer":');
        expect(
          parseFeedbackInput(
            {
              taskId: lesson.task.id,
              text: Array(lesson.task.minWords).fill('word').join(' '),
              attempt: 1,
            },
            level,
            lesson.task,
          ).taskId,
        ).toBe(lesson.task.id);
      }
    }
  }
  expect(
    new Set(units.flatMap((unit) => unit.lessons.map((lesson) => lesson.task.prompt))).size,
  ).toBe(63);
});
