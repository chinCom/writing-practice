import { expect, it } from 'vitest';
import { FeedbackSchema, type Feedback } from '@/lib/feedback/schema';
import { targetsForUnit, validateTargetReport, locateFeedback } from '@/lib/targets';
import { feedback as fixture } from './fixtures/feedback';
const feedback = FeedbackSchema.parse(fixture);
import { curriculumSchema } from '@/lib/curriculum';
import course from '../curriculum/course.draft.json';

const report = [{ tag: 'verb-tense' as const, uses: 3, errors: 1, correction_indexes: [0] }];
const targeted: Feedback = { ...feedback, target_report: report };
it('selects at most two distinct countable Core targets in authored order', () => {
  const unit = curriculumSchema.parse(course)[0];
  expect(
    targetsForUnit({
      ...unit,
      grammarFocus: ['cohesion', 'verb-tense', 'verb-tense', 'articles', 'spelling'],
    }),
  ).toEqual(['verb-tense', 'articles']);
  expect(targetsForUnit({ ...unit, id: 'ielts-test' })).toEqual([]);
  expect(
    targetsForUnit({ ...unit, grammarFocus: ['task-response', 'word-choice', 'paragraphing'] }),
  ).toEqual([]);
});
it('keeps legacy feedback readable and drops malformed optional reports only', () => {
  expect(FeedbackSchema.parse(feedback).target_report).toBeUndefined();
  for (const target_report of [
    null,
    'bad',
    [{ ...report[0], uses: -1 }],
    [{ ...report[0], tag: 'invented' }],
  ]) {
    expect(FeedbackSchema.parse({ ...feedback, target_report }).scores).toEqual(feedback.scores);
    expect(FeedbackSchema.parse({ ...feedback, target_report }).target_report).toBeUndefined();
  }
});
it('accepts consistent complete trusted reports, including no uses without claiming correctness', () => {
  expect(validateTargetReport(targeted, ['verb-tense']).target_report).toEqual(report);
  const empty = {
    ...feedback,
    corrections: [],
    target_report: [{ ...report[0], uses: 0, errors: 0, correction_indexes: [] }],
  };
  expect(validateTargetReport(empty, ['verb-tense']).target_report).toEqual(empty.target_report);
});
it('discards inconsistent, incomplete, unsafe or unsolicited reports without losing feedback', () => {
  const invalid: Feedback[] = [
    { ...targeted, target_report: [{ ...report[0], uses: 0 }] },
    { ...targeted, target_report: [{ ...report[0], errors: 0 }] },
    { ...targeted, target_report: [{ ...report[0], correction_indexes: [9] }] },
    { ...targeted, target_report: [report[0], report[0]] },
    { ...targeted, target_report: [{ ...report[0], tag: 'articles' }] },
    { ...targeted, target_report: [{ ...report[0], errors: 2, correction_indexes: [0, 0] }] },
    { ...targeted, target_report: [{ ...report[0], errors: 0, correction_indexes: [] }] },
    { ...targeted, safety_flag: true },
  ];
  for (const input of invalid) {
    const result = validateTargetReport(input, ['verb-tense']);
    expect(result.target_report).toBeUndefined();
    expect(result.scores).toEqual(feedback.scores);
  }
  expect(validateTargetReport(targeted, []).target_report).toBeUndefined();
  expect(validateTargetReport(targeted, ['verb-tense', 'articles']).target_report).toBeUndefined();
});
it('remaps indexes when earlier low confidence corrections are filtered', () => {
  const input: Feedback = {
    ...targeted,
    corrections: [
      { ...feedback.corrections[0], tag: 'spelling', confidence: 0.2 },
      feedback.corrections[0],
    ],
    target_report: [{ ...report[0], correction_indexes: [1] }],
  };
  const located = locateFeedback('I goed to the beach.', input);
  expect(located.corrections).toHaveLength(1);
  expect(located.target_report?.[0].correction_indexes).toEqual([0]);
});
it('drops the report when locating removes a reported correction through filtering or overlap', () => {
  expect(
    locateFeedback('I go to the beach.', {
      ...targeted,
      corrections: [{ ...feedback.corrections[0], confidence: 0.2 }],
    }).target_report,
  ).toBeUndefined();
  const input: Feedback = {
    ...targeted,
    corrections: [
      { ...feedback.corrections[0], original: 'I goed', tag: 'word-order', severity: 'major' },
      { ...feedback.corrections[0], severity: 'minor' },
    ],
    target_report: [{ ...report[0], correction_indexes: [1] }],
  };
  expect(locateFeedback('I goed to the beach.', input).target_report).toBeUndefined();
});
