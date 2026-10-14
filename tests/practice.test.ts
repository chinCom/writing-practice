import { expect, it } from 'vitest';
import { checkPracticeAnswer, buildPracticeCards, practiceRetryHint } from '@/lib/practice';
import { locateCorrections } from '@/lib/feedback/locate';
import { markedPageSample } from '@/mocks/markedPage.sample';
import { sampleDraft } from '@/mocks/draft.sample';

it('creates exercises only from confident required corrections with a real text location', () => {
  const corrections = locateCorrections(sampleDraft, markedPageSample.corrections);
  const cards = buildPracticeCards(sampleDraft, [
    ...corrections,
    { ...corrections[0], confidence: 0.6 },
    { ...corrections[0], severity: 'style' },
    { ...corrections[0], start: null, end: null },
  ]);
  expect(cards.length).toBeGreaterThan(0);
  expect(cards.length).toBeLessThanOrEqual(corrections.length);
  expect(cards[0].text.slice(cards[0].start, cards[0].end)).toBe(cards[0].original);
  expect(cards.every((card) => card.correctionIndex < corrections.length)).toBe(true);
});

it('guides a partial modal correction toward the remaining verb error, not the fixed modal', () => {
  expect(practiceRetryHint('I could chose from', 'I could choose from')).toEqual({
    kind: 'modal-word',
    modal: 'could',
    phrase: 'chose',
    replacement: 'choose',
  });
  expect(practiceRetryHint(' I COULD\nchose from ', 'I could choose from')).toMatchObject({
    kind: 'modal-word',
    modal: 'could',
    phrase: 'chose',
  });
  expect(practiceRetryHint('I can choose from', 'I could choose from')).toEqual({
    kind: 'phrase',
    phrase: 'can',
  });
  expect(practiceRetryHint('I could choose', 'I could choose from')).toBeUndefined();
  expect(practiceRetryHint('I could chose from.', 'I could choose from.')).toMatchObject({
    kind: 'modal-word',
    phrase: 'chose',
    replacement: 'choose',
  });
  expect(practiceRetryHint('I could really chose from', 'I could choose from')).toEqual({
    kind: 'phrase',
    phrase: 'really chose',
  });
  expect(practiceRetryHint('I could choose from', 'I could choose from')).toBeUndefined();
  expect(practiceRetryHint('I could chose extra words', 'I could choose from')).toEqual({
    kind: 'phrase',
    phrase: 'chose extra words',
  });
});

it('checks the saved phrase without accepting different words and schedules honest review', () => {
  expect(checkPracticeAnswer('  WENT\n', 'went', 1, 0)).toEqual({
    correct: true,
    complete: true,
    box: 2,
    days: 3,
    misses: 0,
  });
  expect(checkPracticeAnswer('goed', 'went', 4, 0)).toEqual({
    correct: false,
    complete: false,
    box: 4,
    days: 0,
    misses: 1,
  });
  expect(checkPracticeAnswer('go', 'went', 4, 1)).toEqual({
    correct: false,
    complete: true,
    box: 1,
    days: 1,
    misses: 0,
  });
  expect(checkPracticeAnswer('went', 'went', 4, 1)).toEqual({
    correct: true,
    complete: true,
    box: 1,
    days: 1,
    misses: 0,
  });
  expect(checkPracticeAnswer('went', 'went', 5, 0).days).toBe(30);
  expect(checkPracticeAnswer('would like to', 'would like to come', 1, 0).correct).toBe(false);
});
