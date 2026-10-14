import { expect, it } from 'vitest';
import { summarizeProgress, type WritingEvent } from '@/lib/progress';

const now = new Date('2026-10-15T12:00:00Z');
function writing(day: string, words = 50, level: WritingEvent['level'] = 'A2'): WritingEvent {
  return {
    at: day + 'T10:00:00Z',
    words,
    level,
    corrections: [{ tag: 'verb-tense', confidence: 0.9, severity: 'major' }],
  };
}
it('counts writing days once, preserves yesterday’s streak, and excludes future activity', () => {
  const result = summarizeProgress(
    [
      writing('2026-10-12'),
      writing('2026-10-13'),
      writing('2026-10-14'),
      writing('2026-10-14', 25),
      writing('2026-10-16'),
    ],
    [],
    now,
  );
  expect(result).toMatchObject({
    sessions: 4,
    words: 175,
    streak: 3,
    longestStreak: 3,
    xp: 40,
    weeklySessions: 4,
  });
  expect(result.writingDays).toEqual(['2026-10-12', '2026-10-13', '2026-10-14']);
  expect(result.week.map((day) => day.written)).toEqual([
    true,
    true,
    true,
    false,
    false,
    false,
    false,
  ]);
  expect(summarizeProgress([writing('2026-10-12')], [], now).streak).toBe(0);
});
it('adds practice XP only for completed correct reviews and keeps uncertain and style marks out of error totals', () => {
  const event = writing('2026-10-15');
  event.corrections.push(
    { tag: 'word-choice', confidence: 0.5, severity: 'minor' },
    { tag: 'register', confidence: 0.9, severity: 'style' },
  );
  const result = summarizeProgress(
    [event],
    [
      { at: '2026-10-15T11:00:00Z', correct: true, complete: true },
      { at: '2026-10-15T11:01:00Z', correct: false, complete: false },
      { at: '2026-10-15T11:02:00Z', correct: false, complete: true },
    ],
    now,
  );
  expect(result).toMatchObject({ xp: 15, reviews: 2, correctReviews: 1 });
  expect(result.errors).toEqual([{ group: 'grammar', count: 1 }]);
});
it('reports per-tag error rates and review accuracy without calling a sparse sample mastery', () => {
  const result = summarizeProgress(
    [writing('2026-10-15', 50)],
    [
      { at: '2026-10-15T11:00:00Z', correct: true, complete: true, tag: 'verb-tense', box: 2 },
      { at: '2026-10-15T11:10:00Z', correct: false, complete: true, tag: 'verb-tense', box: 1 },
    ],
    now,
  );
  expect(result.skills).toEqual([
    {
      tag: 'verb-tense',
      errors: 1,
      errorsPer100Words: 2,
      reviews: 2,
      correct: 1,
      accuracy: 0.5,
      box: 1,
    },
  ]);
});
it('keeps level estimates stable until three consecutive samples support a move', () => {
  const samples = [
    writing('2026-10-10'),
    writing('2026-10-11'),
    writing('2026-10-12', 50, 'B1'),
    writing('2026-10-13', 50, 'B1'),
  ];
  expect(summarizeProgress(samples, [], now).level).toBe('A2');
  expect(summarizeProgress([...samples, writing('2026-10-14', 50, 'B1')], [], now).level).toBe(
    'B1',
  );
  expect(summarizeProgress([], [], now)).toMatchObject({
    level: null,
    words: 0,
    sessions: 0,
    streak: 0,
    xp: 0,
  });
});
