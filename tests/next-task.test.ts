import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { curriculumSchema } from '@/lib/curriculum';
import { buildCoursePath } from '@/lib/curriculum-path';
import { nextTask } from '@/lib/next-task';

const course = curriculumSchema.parse(
  JSON.parse(await readFile('curriculum/course.draft.json', 'utf8')),
);

it('offers the current lesson and opens warm-ups first', () => {
  const units = buildCoursePath(course, 'A2', [], [], 'core');
  const unit = units.find((item) => item.level === 'A2')!;
  const lesson = unit.lessons[0];
  expect(nextTask({ chosenLevel: 'A2', units })).toEqual({
    kind: 'lesson',
    level: 'A2',
    unitTitle: unit.title,
    lessonTitle: lesson.title,
    prompt: lesson.task.prompt,
    minWords: lesson.task.minWords,
    maxWords: lesson.task.maxWords,
    focus: unit.grammarFocus,
    href: '/lesson/' + lesson.id,
    warmupsDone: false,
  });
});

it('goes straight to writing when warm-ups are done', () => {
  const lesson = course[0].lessons[0];
  const warmups = Object.fromEntries(lesson.warmups.map((_, index) => [String(index), true]));
  const units = buildCoursePath(course, 'PRE_A1', [{ lessonId: lesson.id, warmups }], [], 'core');
  expect(nextTask({ chosenLevel: 'PRE_A1', units })).toMatchObject({
    href: '/write/' + lesson.task.id,
    warmupsDone: true,
  });
});

it('asks for placement when no level is chosen', () => {
  expect(
    nextTask({ chosenLevel: null, units: buildCoursePath(course, null, [], [], 'core') }),
  ).toEqual({
    kind: 'placement',
    href: '/placement',
  });
});

it('falls back to the weekend task with no curriculum or no learning path', () => {
  expect(nextTask(undefined)).toEqual({ kind: 'weekend', href: '/write/weekend' });
  expect(nextTask({ chosenLevel: 'A2', units: [] })).toEqual({
    kind: 'weekend',
    href: '/write/weekend',
  });
});
