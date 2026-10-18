import { expect, it } from 'vitest';
import { curriculumDraft } from '@/mocks/curriculum-content';
import {
  lessonCompletion,
  type LessonCheckRecord,
  type LessonProgressRecord,
} from '@/lib/lesson-completion';

const lesson = curriculumDraft[0].lessons[0];
const progress: LessonProgressRecord = {
  lessonId: lesson.id,
  warmups: Object.fromEntries(lesson.warmups.map((_, index) => [String(index), true])),
  completedAt: new Date('2026-10-15T10:00:00Z'),
};
const passing: LessonCheckRecord = {
  taskId: lesson.task.id,
  at: new Date('2026-10-15T11:00:00Z'),
  feedback: { safety_flag: false, scores: { task: 4, organization: 4, grammar: 4, vocabulary: 4 } },
};
it('requires warm-ups and safe writing independently', () => {
  expect(lessonCompletion(lesson, [progress], [])).toMatchObject({
    warmupsDone: true,
    writingDone: false,
    done: false,
    completedAt: null,
  });
  expect(lessonCompletion(lesson, [], [passing])).toMatchObject({
    warmupsDone: false,
    writingDone: true,
    done: false,
    completedAt: null,
  });
  expect(
    lessonCompletion(
      lesson,
      [progress],
      [{ ...passing, feedback: { ...passing.feedback, safety_flag: true } }],
    ),
  ).toMatchObject({ writingDone: false, done: false });
});
it('ignores evidence belonging to other lessons and tasks', () => {
  expect(
    lessonCompletion(
      lesson,
      [{ ...progress, lessonId: 'other' }],
      [{ ...passing, taskId: 'other' }],
    ),
  ).toMatchObject({ warmupsDone: false, writingDone: false, done: false, answers: {} });
});
it('uses the first safe passing check and dates completion by the later requirement', () => {
  const first = { ...passing, at: new Date('2026-10-15T09:00:00Z') };
  expect(lessonCompletion(lesson, [progress], [passing, first])).toMatchObject({
    done: true,
    completedAt: '2026-10-15T10:00:00.000Z',
  });
  expect(lessonCompletion(lesson, [progress], [passing])).toMatchObject({
    completedAt: '2026-10-15T11:00:00.000Z',
  });
});
it('keeps ordinary writing completion distinct from checkpoint scoring', () => {
  const lowGrammar = {
    ...passing,
    feedback: {
      ...passing.feedback,
      scores: { task: 5, organization: 5, grammar: 2, vocabulary: 5 },
    },
  };
  const ordinary = { ...lesson, task: { ...lesson.task, isCheckpoint: false } };
  const checkpoint = { ...lesson, task: { ...lesson.task, isCheckpoint: true } };
  expect(lessonCompletion(ordinary, [progress], [lowGrammar]).done).toBe(true);
  expect(lessonCompletion(checkpoint, [progress], [lowGrammar]).done).toBe(false);
  expect(lessonCompletion(checkpoint, [progress], [passing]).done).toBe(true);
});
it('preserves undated completion without fabricating a timestamp', () => {
  expect(
    lessonCompletion(lesson, [{ ...progress, completedAt: null }], [{ ...passing, at: undefined }]),
  ).toMatchObject({ done: true, completedAt: null });
});
it('returns the latest check including unsafe checks without mutating the supplied history', () => {
  const latest = {
    ...passing,
    at: new Date('2026-10-16T11:00:00Z'),
    feedback: { ...passing.feedback, safety_flag: true },
  };
  const checks = [passing, latest];
  const state = lessonCompletion(lesson, [progress], checks);
  expect(state.latest).toBe(latest);
  expect(state.done).toBe(true);
  expect(checks).toEqual([passing, latest]);
  expect(state.answers).toEqual(progress.warmups);
});
