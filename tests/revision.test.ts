import { expect, it } from 'vitest';
import { diffWriting, compareScores } from '@/lib/revision';

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
