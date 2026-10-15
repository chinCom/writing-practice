import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import {
  curriculumSchema,
  curriculumTrack,
  getTrackUnits,
  ieltsModule,
  publicLesson,
} from '@/lib/curriculum';
import { buildCoursePath } from '@/lib/curriculum-path';

async function supplied() {
  return Promise.all(
    ['course.draft.json', 'ielts.draft.json'].map(async (name) =>
      JSON.parse(await readFile('curriculum/' + name, 'utf8')),
    ),
  );
}
it('validates both supplied tracks and preserves unique IDs and task-specific model lengths', async () => {
  const [core, ielts] = await supplied();
  const units = curriculumSchema.parse([...core, ...ielts]);
  expect(curriculumTrack.options).toEqual(['core', 'ielts']);
  expect(getTrackUnits(units, 'core')).toHaveLength(21);
  expect(getTrackUnits(units, 'ielts')).toHaveLength(8);
  expect(core.flatMap((u: { lessons: unknown[] }) => u.lessons)).toHaveLength(63);
  expect(ielts.flatMap((u: { lessons: unknown[] }) => u.lessons)).toHaveLength(24);
  for (const unit of units)
    for (const lesson of unit.lessons) {
      const words = lesson.miniLesson.modelText.trim().split(/\s+/).length;
      expect(words, lesson.id).toBeGreaterThanOrEqual(lesson.task.minWords);
      expect(words, lesson.id).toBeLessThanOrEqual(lesson.task.maxWords);
      expect(JSON.stringify(publicLesson(lesson))).not.toContain('"answer":');
    }
  expect(ieltsModule('ielts-task1-general-letters-1-task')).toBe('general');
  expect(ieltsModule('ielts-task2-opinion-essays-1-task')).toBe('essay');
  const invalid = structuredClone(units);
  invalid[0].lessons[0].miniLesson.modelText = 'Short';
  expect(curriculumSchema.safeParse(invalid).success).toBe(false);
  const wrongTrack = structuredClone(units);
  wrongTrack.find((unit) => unit.id.startsWith('ielts-'))!.lessons[0].task.id = 'core-task-id';
  expect(curriculumSchema.safeParse(wrongTrack).success).toBe(false);
});
it('keeps Core sequential while IELTS units can be entered independently without placement', async () => {
  const [core, ielts] = await supplied();
  const content = curriculumSchema.parse([...core, ...ielts]);
  const corePath = buildCoursePath(content, 'PRE_A1', [], [], 'core');
  expect(corePath).toHaveLength(21);
  expect(corePath[0].lessons[0].state).toBe('current');
  expect(corePath[0].lessons[1].state).toBe('locked');
  const workspace = buildCoursePath(content, null, [], [], 'ielts');
  expect(workspace).toHaveLength(8);
  for (const unit of workspace) {
    expect(unit.lessons[0].state).toBe('current');
    expect(unit.lessons[1].state).toBe('locked');
  }
  expect(buildCoursePath(content, null, [], [], 'core')[0].lessons[0].state).toBe('locked');
});
