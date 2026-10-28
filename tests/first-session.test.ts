import { expect, it } from 'vitest';
import { firstSessionGuide, firstSessionIndex, firstSessionOrder } from '@/lib/first-session';

const placement = { kind: 'placement', href: '/placement' } as const;

it('starts at placement when the learner has no level and no writing', () => {
  expect(firstSessionGuide([], placement)).toEqual({ step: 'choose' });
  expect(firstSessionIndex('choose')).toBe(1);
});

it('moves to writing once a task is available', () => {
  expect(firstSessionGuide([], undefined)).toEqual({ step: 'write' });
});

it('points at the newest unrevised check so the learner can read feedback', () => {
  const submissions = [
    { id: 'second', attempt: 1 },
    { id: 'first', attempt: 2 },
  ];
  expect(firstSessionGuide(submissions, undefined)).toEqual({
    step: 'feedback',
    feedbackId: 'second',
  });
});

it('moves to feedback for a single completed check', () => {
  expect(firstSessionGuide([{ id: 'only', attempt: 1 }])).toEqual({
    step: 'feedback',
    feedbackId: 'only',
  });
});

it('ends the guide once the learner has revised', () => {
  expect(firstSessionGuide([{ id: 'revised', attempt: 2 }], undefined)).toBeNull();
});

it('keeps the five visible steps in reading order', () => {
  expect(firstSessionOrder).toEqual(['signIn', 'choose', 'write', 'feedback', 'revise']);
});
