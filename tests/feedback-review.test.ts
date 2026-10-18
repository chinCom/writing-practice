import { expect, it } from 'vitest';
import {
  correctionReviewState,
  nextOpenCorrection,
  visibleCorrectionIndexes,
} from '@/lib/feedback/review';
import type { CorrectionChoice } from '@/lib/feedback/choices';
import { locateFeedback } from '@/lib/targets';
import { markedPageSample } from '@/mocks/markedPage.sample';
import { sampleDraft } from '@/mocks/draft.sample';

const feedback = {
  ...locateFeedback(sampleDraft, markedPageSample),
  target_report: [{ tag: 'verb-tense' as const, uses: 3, errors: 2, correction_indexes: [0, 2] }],
};
const choice = (correctionIndex: number, status: CorrectionChoice['status']): CorrectionChoice => ({
  correctionIndex,
  status,
  reason: null,
});

it('hides only target answers and withholds the rewrite on the first attempt', () => {
  const state = correctionReviewState(feedback, [], false);
  expect([...state.hiddenAnswers]).toEqual([0, 2]);
  expect(state.applied.size).toBe(0);
  expect(state.rewriteAvailable).toBe(false);
});
it('reveals an explicit answer without exposing the other target and enables the rewrite', () => {
  const choices = [{ ...choice(0, 'open'), revealed: true }, choice(1, 'applied')];
  const state = correctionReviewState(feedback, choices, false);
  expect([...state.hiddenAnswers]).toEqual([2]);
  expect([...state.applied]).toEqual([1]);
  expect(state.rewriteAvailable).toBe(true);
  expect(choices[0].status).toBe('open');
});
it('unlocks all answers for previous/submitted revisions without altering applied choices', () => {
  const state = correctionReviewState(feedback, [choice(2, 'dismissed')], true);
  expect(state.hiddenAnswers.size).toBe(0);
  expect(state.rewriteAvailable).toBe(true);
  expect(state.applied.size).toBe(0);
});
it('keeps legacy feedback available without target restrictions', () => {
  const state = correctionReviewState(locateFeedback(sampleDraft, markedPageSample), [], false);
  expect(state.hiddenAnswers.size).toBe(0);
  expect(state.rewriteAvailable).toBe(true);
});
it('selects the next open correction, skips applied/dismissed choices, and wraps', () => {
  expect(nextOpenCorrection(0, 4, [choice(1, 'applied'), choice(2, 'dismissed')])).toBe(3);
  expect(nextOpenCorrection(3, 4, [choice(0, 'dismissed')])).toBe(1);
});
it('does not reselect the active correction or move when none remain', () => {
  expect(nextOpenCorrection(0, 3, [choice(1, 'applied'), choice(2, 'dismissed')])).toBeUndefined();
  expect(nextOpenCorrection(0, 1, [])).toBeUndefined();
  expect(nextOpenCorrection(0, 0, [])).toBeUndefined();
});
it.each([
  [0, 0, []],
  [0, 1, [0]],
  [1, 2, [1, 0]],
  [0, 5, [0, 1, 2]],
  [2, 5, [2, 1, 3]],
  [4, 5, [4, 2, 3]],
] as const)(
  'keeps the active card first in its bounded neighbor window (%s/%s)',
  (active, total, expected) => {
    expect(visibleCorrectionIndexes(active, total)).toEqual(expected);
  },
);
