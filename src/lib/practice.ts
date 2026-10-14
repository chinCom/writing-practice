import type { LocatedCorrection } from '@/lib/feedback/schema';

export type PracticeSource = {
  correctionIndex: number;
  text: string;
  start: number;
  end: number;
  original: string;
  suggestion: string;
  tag: LocatedCorrection['tag'];
  explanation: string;
};
export type PracticeQuestion = Omit<
  PracticeSource,
  'suggestion' | 'explanation' | 'correctionIndex'
> & {
  id: string;
  version: number;
};
export type PracticeResult = {
  correct: boolean;
  complete: boolean;
  box: number;
  days: number;
  misses: number;
};
export type PracticeAnswer = PracticeResult & {
  version: number;
  explanation: string;
  suggestion?: string;
  hintTerms?: string[];
};
export function normalizePracticeAnswer(answer: string) {
  return answer.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
}
export function checkPracticeAnswer(
  answer: string,
  suggestion: string,
  box: number,
  misses: number,
): PracticeResult {
  const correct = normalizePracticeAnswer(answer) === normalizePracticeAnswer(suggestion);
  const complete = correct || misses >= 1;
  const nextBox = complete ? (correct && misses === 0 ? Math.min(5, box + 1) : 1) : box;
  return {
    correct,
    complete,
    box: nextBox,
    days: complete ? [1, 3, 7, 14, 30][nextBox - 1] : 0,
    misses: complete ? 0 : misses + 1,
  };
}
export function buildPracticeCards(
  text: string,
  corrections: LocatedCorrection[],
): PracticeSource[] {
  return corrections.flatMap((correction, correctionIndex) => {
    const { start, end } = correction;
    if (
      correction.confidence < 0.7 ||
      correction.severity === 'style' ||
      start === null ||
      end === null ||
      start < 0 ||
      end <= start ||
      end > text.length ||
      normalizePracticeAnswer(text.slice(start, end)) ===
        normalizePracticeAnswer(correction.suggestion)
    )
      return [];
    // Keep the learner's sentence context. Stored model offsets are not used as text boundaries.
    const before = text.slice(0, start);
    const boundary = Math.max(
      before.lastIndexOf('. '),
      before.lastIndexOf('! '),
      before.lastIndexOf('? '),
      before.lastIndexOf('\n'),
    );
    const from = boundary < 0 ? 0 : boundary + (text[boundary] === '\n' ? 1 : 2);
    const after = text.slice(end).search(/[.!?](?:\s|$)|\n/);
    const to = after < 0 ? text.length : end + after + 1;
    return [
      {
        correctionIndex,
        text: text.slice(from, to),
        start: start - from,
        end: end - from,
        original: text.slice(start, end),
        suggestion: correction.suggestion,
        tag: correction.tag,
        explanation: correction.explanation,
      },
    ];
  });
}
