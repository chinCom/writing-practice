import { expect, it } from 'vitest';
import { parseFeedbackInput } from '@/lib/feedback/input';
import { curriculumDraft } from '@/mocks/curriculum-content';
import { gradeWarmup, passesCheckpoint, placementInput, placementOutput } from '@/lib/curriculum';

it('covers A1 through B1 with level-appropriate tasks, models and deterministic warm-ups', () => {
  expect(new Set(curriculumDraft.map((unit) => unit.level))).toEqual(new Set(['A1', 'A2', 'B1']));
  for (const unit of curriculumDraft) {
    expect(unit.lessons).toHaveLength(2);
    for (const lesson of unit.lessons) {
      expect(lesson.task.targetLevel).toBe(unit.level);
      expect(lesson.miniLesson.modelText.length).toBeGreaterThan(30);
      for (const warmup of lesson.warmups) {
        expect(gradeWarmup(warmup, warmup.answer)).toBe(true);
        expect(gradeWarmup(warmup, 'unrelated')).toBe(false);
      }
    }
    expect(unit.lessons.at(-1)?.task.isCheckpoint).toBe(true);
  }
});
it('uses the saved task level and minimum length rather than the former A2-only boundary', () => {
  const a1 = curriculumDraft[0].lessons[0].task;
  const b1 = curriculumDraft[2].lessons[0].task;
  expect(
    parseFeedbackInput(
      { taskId: a1.id, text: Array(20).fill('word').join(' '), attempt: 1 },
      'A1',
      a1,
    ).taskId,
  ).toBe(a1.id);
  expect(() =>
    parseFeedbackInput(
      { taskId: b1.id, text: Array(40).fill('word').join(' '), attempt: 1 },
      'B1',
      b1,
    ),
  ).toThrow('INVALID_TEXT');
  expect(
    parseFeedbackInput(
      { taskId: b1.id, text: Array(100).fill('word').join(' '), attempt: 1 },
      'B1',
      b1,
    ).taskId,
  ).toBe(b1.id);
  expect(() =>
    parseFeedbackInput(
      { taskId: 'weekend', text: Array(100).fill('word').join(' '), attempt: 1 },
      'B1',
      b1,
    ),
  ).toThrow('INVALID_TEXT');
});
it('normalizes warm-up answers without accepting a different answer', () => {
  const warmup = curriculumDraft[0].lessons[0].warmups[0];
  expect(gradeWarmup(warmup, '  ' + warmup.answer.toUpperCase() + '  ')).toBe(true);
});
it('requires the checkpoint score and grammar floor, with safety blocking progression', () => {
  expect(passesCheckpoint({ task: 4, organization: 4, grammar: 3, vocabulary: 3 }, false)).toBe(
    true,
  );
  expect(passesCheckpoint({ task: 5, organization: 5, grammar: 2, vocabulary: 5 }, false)).toBe(
    false,
  );
  expect(passesCheckpoint({ task: 3, organization: 3, grammar: 3, vocabulary: 3 }, false)).toBe(
    false,
  );
  expect(passesCheckpoint({ task: 5, organization: 5, grammar: 5, vocabulary: 5 }, true)).toBe(
    false,
  );
});
it('validates placement samples and grammar answers and rejects forged owners and unsafe output', () => {
  const input = {
    samples: [
      'My name is Lin. I live in Hanoi. I work in a shop.',
      'Last week I visited my friend. We cooked and talked together.',
    ],
    answers: ['is', 'went', 'because'],
  };
  expect(placementInput.safeParse(input).success).toBe(true);
  expect(placementInput.safeParse({ ...input, userId: 'forged' }).success).toBe(false);
  expect(placementInput.safeParse({ ...input, samples: ['short'] }).success).toBe(false);
  expect(
    placementOutput.safeParse({
      cefr: 'B1',
      confidence: 0.8,
      reason: 'You connect ideas clearly.',
      safety_flag: false,
    }).success,
  ).toBe(true);
  expect(
    placementOutput.safeParse({
      cefr: 'C2',
      confidence: 0.8,
      reason: 'Advanced.',
      safety_flag: false,
    }).success,
  ).toBe(false);
});
