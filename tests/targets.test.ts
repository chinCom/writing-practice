import { expect, it, vi } from 'vitest';
import { FeedbackSchema, ModelFeedbackSchema, type Feedback } from '@/lib/feedback/schema';
import {
  growthTargetsEnabled,
  targetsForUnit,
  validateTargetReport,
  locateFeedback,
  visibleFeedback,
} from '@/lib/targets';
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
it('re-derives errors and indexes from corrections instead of discarding a mismatched report', () => {
  const derived = [{ tag: 'verb-tense', uses: 3, errors: 1, correction_indexes: [0] }];
  const mismatched: Feedback[] = [
    { ...targeted, target_report: [{ ...report[0], uses: 3, errors: 0, correction_indexes: [] }] },
    { ...targeted, target_report: [{ ...report[0], correction_indexes: [9] }] },
    { ...targeted, target_report: [report[0], report[0]] },
  ];
  for (const input of mismatched) {
    const result = validateTargetReport(input, ['verb-tense']);
    expect(result.target_report).toEqual(derived);
    expect(result.scores).toEqual(feedback.scores);
  }
  // A report for another tag gives this target zero uses, raised to its one derived error.
  expect(
    validateTargetReport({ ...targeted, target_report: [{ ...report[0], tag: 'articles' }] }, [
      'verb-tense',
    ]).target_report,
  ).toEqual([{ ...derived[0], uses: 1 }]);
});
it('omits the report for unsafe feedback or when no targets are trusted', () => {
  expect(
    validateTargetReport({ ...targeted, safety_flag: true }, ['verb-tense']),
  ).not.toHaveProperty('target_report');
  expect(validateTargetReport(targeted, []).target_report).toBeUndefined();
});
it('derives the report from the model uses and same-tag corrections, keeping every trusted target', () => {
  const modelOutput = (uses: { tag: string; uses: number }[]) =>
    ModelFeedbackSchema.parse({
      ...feedback,
      corrections: [
        { ...feedback.corrections[0], tag: 'verb-tense', severity: 'major' },
        { ...feedback.corrections[0], tag: 'verb-tense', severity: 'style' },
        { ...feedback.corrections[0], tag: 'articles', severity: 'minor' },
        { ...feedback.corrections[0], tag: 'verb-tense', severity: 'minor' },
      ],
      target_report: uses,
    });
  expect(
    validateTargetReport(modelOutput([{ tag: 'verb-tense', uses: 3 }]), ['verb-tense', 'articles'])
      .target_report,
  ).toEqual([
    { tag: 'verb-tense', uses: 3, errors: 2, correction_indexes: [0, 3] },
    { tag: 'articles', uses: 1, errors: 1, correction_indexes: [2] },
  ]);
  // A model that reports fewer uses than errors still gets a consistent report.
  expect(
    validateTargetReport(modelOutput([{ tag: 'verb-tense', uses: 0 }]), ['verb-tense'])
      .target_report,
  ).toEqual([{ tag: 'verb-tense', uses: 2, errors: 2, correction_indexes: [0, 3] }]);
});
it('counts only confident corrections as target errors, matching the study scorer', () => {
  const output = ModelFeedbackSchema.parse({
    ...feedback,
    corrections: [
      { ...feedback.corrections[0], tag: 'verb-tense', severity: 'major', confidence: 0.69 },
      { ...feedback.corrections[0], tag: 'verb-tense', severity: 'major', confidence: 0.7 },
    ],
    target_report: [{ tag: 'verb-tense', uses: 4 }],
  });
  expect(validateTargetReport(output, ['verb-tense']).target_report).toEqual([
    { tag: 'verb-tense', uses: 4, errors: 1, correction_indexes: [1] },
  ]);
});
it('accepts the uses-only model shape and still parses the full saved shape', () => {
  const uses = ModelFeedbackSchema.parse({
    ...feedback,
    target_report: [{ tag: 'verb-tense', uses: 3 }],
  });
  expect(uses.target_report).toEqual([{ tag: 'verb-tense', uses: 3 }]);
  expect(FeedbackSchema.parse(targeted).target_report).toEqual(report);
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
it('offers no growth targets and hides saved reports unless GROWTH_TARGETS is true', () => {
  const unit = curriculumSchema.parse(course)[0];
  const focus = { ...unit, grammarFocus: ['verb-tense', 'articles'] as typeof unit.grammarFocus };
  vi.stubEnv('GROWTH_TARGETS', 'false');
  expect(targetsForUnit(focus)).toEqual([]);
  expect(visibleFeedback(targeted)).not.toHaveProperty('target_report');
  expect(visibleFeedback(targeted).scores).toEqual(feedback.scores);
  vi.stubEnv('GROWTH_TARGETS', 'yes');
  expect(growthTargetsEnabled()).toBe(false);
  vi.stubEnv('GROWTH_TARGETS', 'true');
  expect(targetsForUnit(focus)).toEqual(['verb-tense', 'articles']);
  expect(visibleFeedback(targeted)).toBe(targeted);
  vi.unstubAllEnvs();
});
