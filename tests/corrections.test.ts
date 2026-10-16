import { expect, it } from 'vitest';
import { filterLiveCorrections } from '@/lib/feedback/corrections';
import { correction } from './fixtures/feedback';

it('drops unchanged, absent, optional, and uncertain live claims', () => {
  const valid = { ...correction, original: 'writed', suggestion: 'wrote' };
  expect(
    filterLiveCorrections('Mina writed a postcard.', [
      { ...valid, suggestion: 'writed' },
      { ...valid, original: 'Mina wrote' },
      { ...valid, severity: 'style' },
      { ...valid, confidence: 0.69 },
      valid,
    ]),
  ).toEqual([valid]);
});

it('requires the quoted source to match whole words and its exact spelling and spacing', () => {
  const weather = { ...correction, original: 'weather', suggestion: 'climate' };
  const spaced = { ...correction, original: 'very good', suggestion: 'excellent' };
  expect(
    filterLiveCorrections('The weather is very  good.', [
      { ...correction, original: 'eat', suggestion: 'ate' },
      { ...correction, original: 'Weather', suggestion: 'climate' },
      spaced,
      weather,
    ]),
  ).toEqual([weather]);
});

it('preserves genuine capitalization and punctuation-spacing edits', () => {
  const capital = { ...correction, original: 'monday', suggestion: 'Monday' };
  const punctuation = { ...correction, original: 'parcel .', suggestion: 'parcel.' };
  expect(filterLiveCorrections('On monday I sent a parcel .', [capital, punctuation])).toEqual([
    capital,
    punctuation,
  ]);
});

it('enforces the twelve-word limit for both sides without changing accepted edits', () => {
  const twelveWords = 'one two three four five six seven eight nine ten eleven twelve';
  const accepted = { ...correction, original: twelveWords, suggestion: 'a shorter phrase' };
  expect(
    filterLiveCorrections(twelveWords + ' thirteen', [
      { ...accepted, original: twelveWords + ' thirteen' },
      { ...accepted, suggestion: twelveWords + ' thirteen' },
      accepted,
    ]),
  ).toEqual([accepted]);
});
