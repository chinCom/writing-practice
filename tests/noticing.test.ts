import { expect, it } from 'vitest';
import { lessonSchema, publicLesson } from '@/lib/curriculum';
import { gradeNoticing } from '@/lib/noticing';
import { curriculumDraft } from '@/mocks/curriculum-content';

const original = curriculumDraft[0].lessons[0];
function example() {
  return {
    ...original,
    noticing: {
      instruction: 'Find both examples of the present verb.',
      spans: [
        { start: 2, end: 4 },
        { start: 6, end: 8 },
      ],
      explanation: 'The verb agrees with the subject.',
    },
    miniLesson: { ...original.miniLesson, modelText: 'I am. I am.' },
  };
}
it('grades exact unordered selections and rejects guesses, duplicate spans and invalid boundaries', () => {
  const exercise = lessonSchema.parse(example()).noticing!;
  expect(
    gradeNoticing(exercise, [
      { start: 6, end: 8 },
      { start: 2, end: 4 },
    ]),
  ).toBe(true);
  expect(gradeNoticing(exercise, [{ start: 2, end: 4 }])).toBe(false);
  expect(
    gradeNoticing(exercise, [
      { start: 2, end: 4 },
      { start: 2, end: 4 },
    ]),
  ).toBe(false);
  const bad = example();
  bad.noticing.spans[1] = { start: 3, end: 99 };
  expect(lessonSchema.safeParse(bad).success).toBe(false);
});
it('exposes all model words without publishing correct spans or explanations and preserves legacy lessons', () => {
  const lesson = lessonSchema.parse(example());
  const visible = publicLesson(lesson);
  expect(visible.noticing).toEqual({ instruction: lesson.noticing!.instruction });
  expect(JSON.stringify(visible)).not.toContain('"spans"');
  expect(publicLesson(original).noticing).toBeUndefined();
});
