import { expect, it } from 'vitest';
import { assessMastery, advisoryTargets } from '@/lib/mastery';
import { markedPageSample } from '@/mocks/markedPage.sample';
import { buildCoursePath } from '@/lib/curriculum-path';
import { curriculumDraft } from '@/mocks/curriculum-content';

const feedback = {
  ...markedPageSample,
  safety_flag: false,
  scores: { task: 2, organization: 2, grammar: 2, vocabulary: 2 },
  target_report: [{ tag: 'verb-tense' as const, uses: 10, errors: 2, correction_indexes: [0, 1] }],
};
const input = { targets: ['verb-tense' as const], feedback, attempt: 1, isCheckpoint: false };
it('accepts the inclusive mastery threshold but not the next error', () => {
  expect(assessMastery(input)).toEqual({ outcome: 'mastery', carried: [] });
  const failing = { ...feedback, target_report: [{ ...feedback.target_report[0], errors: 3 }] };
  expect(assessMastery({ ...input, feedback: failing })).toEqual({
    outcome: 'revise',
    carried: [],
  });
  expect(assessMastery({ ...input, feedback: failing, attempt: 2 }).outcome).toBe('revise');
  expect(assessMastery({ ...input, feedback: failing, attempt: 3 })).toEqual({
    outcome: 'carry-forward',
    carried: ['verb-tense'],
  });
});
it('does not turn missing, partial, zero-use or avoided evidence into mastery', () => {
  expect(
    assessMastery({ ...input, feedback: { ...feedback, target_report: undefined } }).outcome,
  ).toBe('unknown');
  expect(assessMastery({ ...input, targets: ['verb-tense', 'articles'] }).outcome).toBe('unknown');
  expect(
    assessMastery({
      ...input,
      feedback: {
        ...feedback,
        target_report: [{ ...feedback.target_report[0], uses: 0, errors: 0 }],
      },
    }).outcome,
  ).toBe('revise');
  expect(assessMastery({ ...input, baseline: [{ tag: 'verb-tense', uses: 30 }] }).outcome).toBe(
    'revise',
  );
  expect(assessMastery({ ...input, baseline: [{ tag: 'verb-tense', uses: 20 }] }).outcome).toBe(
    'mastery',
  );
});
it('never bypasses safety, task relevance or the checkpoint rubric with revisions', () => {
  expect(
    assessMastery({ ...input, feedback: { ...feedback, safety_flag: true }, attempt: 3 }).outcome,
  ).toBe('blocked');
  expect(
    assessMastery({
      ...input,
      feedback: { ...feedback, scores: { ...feedback.scores, task: 1 } },
      attempt: 3,
    }).outcome,
  ).toBe('blocked');
  expect(assessMastery({ ...input, isCheckpoint: true, attempt: 3 }).outcome).toBe('blocked');
  expect(
    assessMastery({
      ...input,
      isCheckpoint: true,
      feedback: { ...feedback, scores: { task: 4, organization: 4, grammar: 3, vocabulary: 3 } },
    }).outcome,
  ).toBe('checkpoint');
});
it('shows recommendations on the next lesson without changing legacy unlocking or IELTS', () => {
  const course = structuredClone(curriculumDraft);
  course[0].grammarFocus = ['subject-verb-agreement'];
  const first = course[0].lessons[0];
  const path = buildCoursePath(
    course,
    'A1',
    [{ lessonId: first.id, warmups: { 0: true, 1: true } }],
    [
      {
        taskId: first.task.id,
        at: new Date('2026-10-16'),
        feedback,
        masteryAdvisory: { outcome: 'carry-forward', carried: ['articles'] },
      },
    ],
  );
  expect(path[0].lessons[1].state).toBe('current');
  expect(path[0].lessons[1].advisoryTargets).toEqual([
    { tag: 'subject-verb-agreement', source: 'unit' },
    { tag: 'articles', source: 'carried' },
  ]);
  expect(buildCoursePath(course, 'A1', [], [])[0].lessons[0].advisoryTargets).toEqual([
    { tag: 'subject-verb-agreement', source: 'unit' },
  ]);
});
it('keeps two distinct targets with unit focus ahead of carried recommendations', () => {
  expect(advisoryTargets(['verb-tense'], ['articles', 'prepositions'])).toEqual([
    { tag: 'verb-tense', source: 'unit' },
    { tag: 'articles', source: 'carried' },
  ]);
  expect(advisoryTargets(['verb-tense', 'articles'], ['prepositions'])).toEqual([
    { tag: 'verb-tense', source: 'unit' },
    { tag: 'articles', source: 'unit' },
  ]);
  expect(advisoryTargets(['verb-tense'], ['verb-tense', 'articles'])).toHaveLength(2);
});
