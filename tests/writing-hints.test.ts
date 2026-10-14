import { describe, expect, it } from 'vitest';
import { analyzeWriting } from '@/lib/writing-hints';
import { weekendTask } from '@/lib/curriculum';

const task = { id: 'weekend', minWords: 40, maxWords: 100, targetLevel: 'A2' as const };

describe('local writing hints', () => {
  it('finds clear errors in the draft without rewriting the paragraph', () => {
    const hints = analyzeWriting('Last weekend I go to the beach. We swimmed in the sea.', task);
    expect(hints).toContainEqual({
      kind: 'past',
      original: 'Last weekend I go',
      suggestion: 'went',
    });
    expect(hints).toContainEqual({ kind: 'verb', original: 'swimmed', suggestion: 'swam' });
    expect(hints.length).toBeLessThanOrEqual(3);
  });

  it('removes fixed issues and does not change present-tense or quoted examples', () => {
    const text = 'Last weekend I went to the beach. We swam in the sea. I go there every week.';
    expect(analyzeWriting(text, task).some((hint) => ['past', 'verb'].includes(hint.kind))).toBe(
      false,
    );
    expect(
      analyzeWriting('My teacher wrote “We swimmed in the sea” as an example.', task).some(
        (hint) => hint.kind === 'verb',
      ),
    ).toBe(false);
  });

  it('uses the current task range and checks only the weekend task for an invitation', () => {
    const text = 'I enjoyed my visit to the beach with my family and we came home happy.';
    expect(analyzeWriting(text, task)).toContainEqual({ kind: 'short', remaining: 25 });
    expect(analyzeWriting(text, task)).toContainEqual({ kind: 'invitation' });
    expect(analyzeWriting(text, { ...task, id: 'formal-letter', minWords: 5 })).not.toContainEqual({
      kind: 'invitation',
    });
    expect(analyzeWriting('Would you like to join us next time?', task)).not.toContainEqual({
      kind: 'invitation',
    });
    expect(analyzeWriting('come with us next weekend?', task)).not.toContainEqual({
      kind: 'invitation',
    });
  });

  it('does not flag valid repeated verbs or demonstratives', () => {
    for (const text of ['I had had a good day.', 'I knew that that was true.']) {
      expect(analyzeWriting(text, task)).not.toContainEqual({ kind: 'repeat' });
    }
    expect(analyzeWriting('I went to the the beach.', task)).toContainEqual({ kind: 'repeat' });
  });

  it('returns no grammar claim for clean writing and clears hints for an empty draft', () => {
    expect(analyzeWriting('', task)).toEqual([]);
    expect(analyzeWriting('   ', task)).toEqual([]);
    const text =
      'Hi Maria! Last weekend I went to the beach with my family. We enjoyed the sunshine and swam in the sea. We came home tired but happy. Would you like to join us on our next visit to the beach?';
    expect(analyzeWriting(text, weekendTask)).toEqual([]);
  });

  it('offers advanced length and paragraph guidance without fabricating programme facts', () => {
    const advanced = {
      ...task,
      id: 'application',
      targetLevel: 'C1' as const,
      minWords: 250,
      maxWords: 400,
    };
    const words = Array.from({ length: 401 }, () => 'evidence').join(' ');
    expect(analyzeWriting(words, advanced)).toContainEqual({ kind: 'long', excess: 1 });
    expect(analyzeWriting(words, advanced)).toContainEqual({ kind: 'paragraphs' });
    expect(
      analyzeWriting(words + '\n\nMy next paragraph.', advanced).some(
        (hint) => hint.kind === 'paragraphs',
      ),
    ).toBe(false);
  });
});
