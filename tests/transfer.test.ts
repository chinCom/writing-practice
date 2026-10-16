import { expect, it } from 'vitest';
import { gradeTransfer } from '@/lib/transfer';
it('accepts authored alternate answers and schedules locally without forgiving punctuation errors', () => {
  const item = {
    answers: ['Where is Mai?', 'Where is Mai now?'],
    explanation: 'Use a question mark.',
  };
  expect(gradeTransfer(item, 'where is mai?', 1, 0)).toMatchObject({
    correct: true,
    complete: true,
    days: 3,
  });
  expect(gradeTransfer(item, 'Where is Mai', 1, 0)).toMatchObject({
    correct: false,
    complete: false,
  });
  expect(gradeTransfer(item, 'wrong', 3, 1)).toMatchObject({
    correct: false,
    complete: true,
    days: 1,
    suggestion: 'Where is Mai?',
  });
});
it('keeps capital letters in capitalization drills while still ignoring extra spaces', () => {
  const item = {
    tag: 'capitalization' as const,
    answers: ['I am Tuan.'],
    explanation: 'Use a capital I.',
  };
  expect(gradeTransfer(item, 'i am tuan.', 1, 0)).toMatchObject({
    correct: false,
    complete: false,
  });
  expect(gradeTransfer(item, '  I   am Tuan. ', 1, 0)).toMatchObject({
    correct: true,
    complete: true,
  });
});
