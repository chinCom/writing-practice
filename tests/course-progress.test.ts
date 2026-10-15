import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { curriculumSchema } from '@/lib/curriculum';
import { buildCoursePath } from '@/lib/curriculum-path';
import { summarizeCourse } from '@/lib/course-progress';

const course = curriculumSchema.parse(
  JSON.parse(await readFile('curriculum/course.draft.json', 'utf8')),
);
const passing = {
  safety_flag: false,
  scores: { task: 4, organization: 4, grammar: 4, vocabulary: 4 },
};
const now = new Date('2026-10-15T12:00:00Z');

function finish(lessonIndex: number, warmupsAt: string, checkAt: string) {
  const lesson = course.flatMap((unit) => unit.lessons)[lessonIndex];
  return {
    progress: {
      lessonId: lesson.id,
      warmups: Object.fromEntries(lesson.warmups.map((_, index) => [String(index), true])),
      completedAt: new Date(warmupsAt),
    },
    check: { taskId: lesson.task.id, at: new Date(checkAt), feedback: passing },
  };
}

it('dates a lesson by the later of warm-up completion and its first passing check', () => {
  const first = finish(0, '2026-10-13T09:00:00Z', '2026-10-14T09:00:00Z');
  const units = buildCoursePath(course, 'PRE_A1', [first.progress], [first.check], 'core');
  expect(units[0].lessons[0]).toMatchObject({
    state: 'done',
    completedAt: '2026-10-14T09:00:00.000Z',
  });
  expect(units[0].lessons[1]).toMatchObject({ state: 'current', completedAt: null });
});

it('summarizes completion, the current lesson, and this UTC week', () => {
  const first = finish(0, '2026-10-05T09:00:00Z', '2026-10-05T10:00:00Z');
  const second = finish(1, '2026-10-13T09:00:00Z', '2026-10-13T10:00:00Z');
  const units = buildCoursePath(
    course,
    'PRE_A1',
    [first.progress, second.progress],
    [first.check, second.check],
    'core',
  );
  const summary = summarizeCourse(units, 'core', now);
  expect(summary).toMatchObject({
    track: 'core',
    lessonsDone: 2,
    lessonsTotal: 63,
    unitsDone: 0,
    unitsTotal: 21,
    doneThisWeek: 1,
  });
  expect(summary.levels[0]).toEqual({ level: 'PRE_A1', done: 2, total: 9 });
  expect(summary.current).toMatchObject({ lessonId: units[0].lessons[2].id, warmupsDone: false });
  expect(summary.recent.map((item) => item.lessonId)).toEqual([
    units[0].lessons[1].id,
    units[0].lessons[0].id,
  ]);
});

it('has no current lesson without placement', () => {
  const summary = summarizeCourse(buildCoursePath(course, null, [], [], 'core'), 'core', now);
  expect(summary.current).toBeNull();
  expect(summary.lessonsDone).toBe(0);
});
