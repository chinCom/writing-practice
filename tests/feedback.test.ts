import { describe, expect, it } from 'vitest';
import { FeedbackSchema } from '@/lib/feedback/schema';
import { locateCorrections } from '@/lib/feedback/locate';
import { parseFeedbackInput } from '@/lib/feedback/input';

import { correction, feedback } from './fixtures/feedback';
describe('feedback contract', () => {
  it('accepts valid feedback and rejects unknown tags and missing safety decisions', () => {
    expect(FeedbackSchema.safeParse(feedback).success).toBe(true);
    expect(FeedbackSchema.safeParse({ ...feedback, safety_flag: undefined }).success).toBe(false);
    expect(
      FeedbackSchema.safeParse({ ...feedback, corrections: [{ ...correction, tag: 'unknown' }] })
        .success,
    ).toBe(false);
  });
  it('rejects unexpected AI fields at every object boundary', () => {
    expect(FeedbackSchema.safeParse({ ...feedback, userId: 'other' }).success).toBe(false);
    expect(
      FeedbackSchema.safeParse({ ...feedback, scores: { ...feedback.scores, overall: 5 } }).success,
    ).toBe(false);
    expect(
      FeedbackSchema.safeParse({ ...feedback, corrections: [{ ...correction, command: 'ignore' }] })
        .success,
    ).toBe(false);
  });
  it('locates repeated snippets without claiming the same range twice', () => {
    expect(
      locateCorrections('I goed and goed.', [correction, correction]).map(({ start, end }) => [
        start,
        end,
      ]),
    ).toEqual([
      [2, 6],
      [11, 15],
    ]);
  });
  it('ignores uncertain feedback and keeps missing snippets as unmarked notes', () => {
    expect(locateCorrections('I went.', [{ ...correction, confidence: 0.69 }])).toEqual([]);
    expect(locateCorrections('I went.', [correction])[0]).toMatchObject({ start: null, end: null });
  });
  it('maps normalized whitespace, case and small spelling differences to original offsets', () => {
    const results = locateCorrections('I GOED. very  good. swimmed.', [
      correction,
      { ...correction, original: 'very good' },
      { ...correction, original: 'swimed' },
    ]);
    expect(results.map(({ start, end }) => [start, end])).toEqual([
      [2, 6],
      [8, 18],
      [20, 27],
    ]);
  });
  it('marks complete words instead of matching inside a different word', () => {
    expect(
      locateCorrections('The weather was good. I eat ice cream.', [
        { ...correction, original: 'eat' },
      ])[0],
    ).toMatchObject({ start: 24, end: 27 });
  });
  it('keeps the more severe correction when snippets overlap', () => {
    expect(
      locateCorrections('I goed.', [
        { ...correction, original: 'I goed', severity: 'minor' },
        correction,
      ]).map(({ original }) => original),
    ).toEqual(['goed']);
  });
  it('normalizes text and rejects excessive A2 input and untrusted ownership fields', () => {
    const text = 'I went to the beach with my family. '.repeat(5);
    expect(
      parseFeedbackInput({ taskId: 'weekend', text: `\u0000 ${text} `, attempt: 1 }).text,
    ).toBe(text.trim());
    expect(() =>
      parseFeedbackInput({ taskId: 'weekend', text: 'word '.repeat(300), attempt: 1 }),
    ).toThrow();
    expect(() =>
      parseFeedbackInput({ taskId: 'weekend', text, attempt: 1, userId: 'other' }),
    ).toThrow();
  });
});
