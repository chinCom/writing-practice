import { expect, it } from 'vitest';
import { summarizeImprovement, weekStartUtc, type CheckEvent } from '@/lib/improvement';

const now = new Date('2026-10-30T12:00:00Z');
let counter = 0;
function check(
  at: string,
  scores: [number, number, number, number],
  options: Partial<CheckEvent> = {},
): CheckEvent {
  counter++;
  const [task, organization, grammar, vocabulary] = scores;
  return {
    id: 'check-' + counter,
    at,
    attempt: 1,
    parentId: null,
    words: 100,
    scores: { task, organization, grammar, vocabulary },
    corrections: [],
    ...options,
  };
}

it('needs six first attempts before comparing then and now', () => {
  const five = Array.from({ length: 5 }, (_, index) =>
    check(`2026-10-0${index + 1}T10:00:00Z`, [3, 3, 3, 3]),
  );
  const result = summarizeImprovement(five, now);
  expect(result.firstChecks).toBe(5);
  expect(result.checksNeeded).toBe(1);
  expect(result.thenVsNow).toBeNull();
  expect(summarizeImprovement([], now)).toEqual({
    firstChecks: 0,
    checksNeeded: 6,
    weekly: [],
    thenVsNow: null,
    revisionGain: null,
  });
});

it('compares the first three and the latest three first attempts, ignoring revisions', () => {
  const checks = [
    check('2026-10-05T10:00:00Z', [2, 2, 1, 2]),
    check('2026-10-06T10:00:00Z', [2, 3, 2, 2]),
    check('2026-10-07T10:00:00Z', [3, 2, 2, 3]),
    check('2026-10-07T11:00:00Z', [5, 5, 5, 5], { attempt: 2, parentId: 'check-3' }),
    check('2026-10-20T10:00:00Z', [4, 3, 3, 3]),
    check('2026-10-21T10:00:00Z', [4, 4, 3, 4]),
    check('2026-10-22T10:00:00Z', [4, 4, 4, 4]),
  ];
  const result = summarizeImprovement(checks, now);
  expect(result.firstChecks).toBe(6);
  expect(result.checksNeeded).toBe(0);
  expect(result.thenVsNow?.then).toMatchObject({ task: 2.3, grammar: 1.7, average: 2.2 });
  expect(result.thenVsNow?.now).toMatchObject({ task: 4, grammar: 3.3, average: 3.7 });
});

it('counts errors per 100 words with the same rule as the error groups', () => {
  const result = summarizeImprovement(
    [
      check('2026-10-05T10:00:00Z', [3, 3, 3, 3], {
        words: 50,
        corrections: [
          { confidence: 0.9, severity: 'major' },
          { confidence: 0.6, severity: 'major' },
          { confidence: 0.9, severity: 'style' },
          { confidence: 0.8, severity: 'minor' },
        ],
      }),
    ],
    now,
  );
  expect(result.weekly[0].errorsPer100Words).toBe(4);
});

it('reports the average revision gain and ignores orphan revisions', () => {
  const parent = check('2026-10-05T10:00:00Z', [2, 2, 2, 2]);
  const revision = check('2026-10-05T11:00:00Z', [3, 3, 3, 2], {
    attempt: 2,
    parentId: parent.id,
  });
  const orphan = check('2026-10-06T11:00:00Z', [5, 5, 5, 5], { attempt: 2, parentId: 'missing' });
  const result = summarizeImprovement([parent, revision, orphan], now);
  expect(result.revisionGain).toEqual({ pairs: 1, averageDelta: 0.8 });
});

it('buckets by UTC Monday weeks and ignores future checks', () => {
  expect(weekStartUtc('2026-10-11T23:30:00Z')).toBe('2026-10-05');
  expect(weekStartUtc('2026-10-12T00:10:00Z')).toBe('2026-10-12');
  const result = summarizeImprovement(
    [
      check('2026-10-11T23:30:00Z', [0, 0, 0, 0]),
      check('2026-10-12T00:10:00Z', [4, 4, 4, 4]),
      check('2026-11-02T10:00:00Z', [5, 5, 5, 5]),
    ],
    now,
  );
  expect(result.weekly.map((week) => [week.weekStart, week.checks, week.average])).toEqual([
    ['2026-10-05', 1, 0],
    ['2026-10-12', 1, 4],
  ]);
});
