import { expect, it } from 'vitest';
import { diffWriting, compareScores, avoidedTargets } from '@/lib/revision';

it('does not call a target fixed when uses fall below half the baseline', () => {
  const baseline = [
    { tag: 'verb-tense' as const, uses: 8, errors: 3, correction_indexes: [0, 1, 2] },
  ];
  expect(
    avoidedTargets(baseline, [{ ...baseline[0], uses: 3, errors: 0, correction_indexes: [] }]),
  ).toEqual(['verb-tense']);
  expect(
    avoidedTargets(baseline, [{ ...baseline[0], uses: 4, errors: 0, correction_indexes: [] }]),
  ).toEqual([]);
  expect(avoidedTargets(undefined, baseline)).toEqual([]);
});
it('reconstructs both texts without dropping whitespace or punctuation', () => {
  const parts = diffWriting('I go.\nHi!', 'I went.\nHi Maria!');
  expect(
    parts
      .filter((part) => part.kind !== 'added')
      .map((part) => part.text)
      .join(''),
  ).toBe('I go.\nHi!');
  expect(
    parts
      .filter((part) => part.kind !== 'removed')
      .map((part) => part.text)
      .join(''),
  ).toBe('I went.\nHi Maria!');
  expect(parts).toContainEqual({ kind: 'removed', text: 'go' });
  expect(parts).toContainEqual({ kind: 'added', text: 'went' });
  expect(diffWriting('Same text', 'Same text')).toEqual([{ kind: 'same', text: 'Same text' }]);
});
it('shows increases and decreases instead of calling every revision an improvement', () => {
  expect(
    compareScores(
      { task: 2, organization: 3, grammar: 4, vocabulary: 3 },
      { task: 4, organization: 3, grammar: 2, vocabulary: 4 },
    ),
  ).toEqual({ task: 2, organization: 0, grammar: -2, vocabulary: 1 });
});
