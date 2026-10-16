import { expect, it } from 'vitest';
import { summarizeTargets, reviewTargets, type TargetEvent } from '@/lib/target-progress';

const now = new Date('2026-10-15T12:00:00Z');
function event(day: number, overrides: Partial<TargetEvent> = {}): TargetEvent {
  return {
    submissionId: 'check-' + day,
    taskId: 'task-' + day,
    at: `2026-10-${String(day).padStart(2, '0')}T12:00:00Z`,
    tag: 'articles',
    level: 'A2',
    uses: 10,
    errors: 0,
    isFirstAttempt: true,
    graderVersion: 'model:prompt-1',
    ...overrides,
  };
}

it('derives new, learning, secure and review-due from distinct new tasks at UTC boundaries', () => {
  expect(summarizeTargets([event(10)], now)[0]).toMatchObject({
    state: 'new',
    tasks: 1,
    nextReviewAt: null,
  });
  expect(summarizeTargets([event(10, { errors: 3 })], now)[0].state).toBe('learning');
  const secure = summarizeTargets([event(10), event(15)], now)[0];
  expect(secure).toMatchObject({
    state: 'secure',
    tasks: 2,
    nextReviewAt: '2026-10-16T12:00:00.000Z',
  });
  expect(summarizeTargets([event(10), event(14)], now)[0].state).toBe('review-due');
  expect(summarizeTargets([event(10), event(14)], new Date('2026-10-15T11:59:59Z'))[0].state).toBe(
    'secure',
  );
});

it('advances spacing only after due successful new writing and resets on a miss', () => {
  const checks = [event(1), event(2), event(3), event(4), event(6), event(13)];
  expect(summarizeTargets(checks, now)[0]).toMatchObject({
    nextReviewAt: '2026-10-27T12:00:00.000Z',
    state: 'secure',
  });
  expect(summarizeTargets([...checks, event(14, { errors: 3 })], now)[0]).toMatchObject({
    state: 'learning',
    nextReviewAt: null,
  });
  expect(summarizeTargets([...checks, event(14, { errors: 3 }), event(15)], now)[0].state).toBe(
    'new',
  );
  const later = [
    event(1),
    event(2),
    event(3),
    event(6),
    event(13),
    event(27),
    { ...event(28), at: '2026-11-26T12:00:00Z' },
  ];
  expect(summarizeTargets(later, new Date('2026-11-26T12:00:00Z'))[0].nextReviewAt).toBe(
    '2026-12-26T12:00:00.000Z',
  );
});

it('does not turn zero or sparse uses into secure mastery or count revisions and repeated tasks', () => {
  expect(summarizeTargets([event(10), event(14, { uses: 0 })], now)[0]).toMatchObject({
    state: 'unknown',
    latest: null,
    nextReviewAt: null,
  });
  expect(summarizeTargets([event(10, { uses: 1 }), event(14, { uses: 1 })], now)[0].state).toBe(
    'learning',
  );
  expect(
    summarizeTargets(
      [
        event(10),
        event(14, { taskId: 'task-10' }),
        event(15, { isFirstAttempt: false }),
        event(16),
      ],
      now,
    )[0],
  ).toMatchObject({ state: 'new', tasks: 1 });
});

it('separates levels and versions, weights raw rates by uses and ignores malformed evidence', () => {
  const rows = summarizeTargets(
    [
      event(1),
      event(2),
      event(10, { graderVersion: 'model:prompt-2', errors: 1 }),
      event(14, { graderVersion: 'model:prompt-2', uses: 5, errors: 1 }),
      event(13, { level: 'B1', errors: 4 }),
      event(12, { uses: 0, errors: 1 }),
    ],
    now,
  );
  expect(rows.find((row) => row.level === 'A2')).toMatchObject({
    tasks: 2,
    graderVersion: 'model:prompt-2',
    errors: 2,
    uses: 15,
    first: { errors: 1, uses: 10 },
    latest: { errors: 1, uses: 5 },
  });
  expect(rows.find((row) => row.level === 'B1')).toMatchObject({ tasks: 1, state: 'learning' });
  expect(summarizeTargets([], now)).toEqual([]);
});

it('fills only unused unit slots with due same-level targets in earliest-due order', () => {
  const rows = summarizeTargets(
    [
      event(1),
      event(2),
      event(3, { tag: 'verb-tense' }),
      event(4, { tag: 'verb-tense' }),
      event(5, { level: 'B1', tag: 'punctuation' }),
      event(6, { level: 'B1', tag: 'punctuation' }),
    ],
    now,
  );
  expect(reviewTargets(['connectors'], 'A2', rows)).toEqual(['connectors', 'articles']);
  expect(reviewTargets(['articles', 'connectors'], 'A2', rows)).toEqual(['articles', 'connectors']);
  expect(reviewTargets(['articles'], 'A2', rows)).toEqual(['articles', 'verb-tense']);
});
