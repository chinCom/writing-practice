import { checkPracticeAnswer, matchesPracticeAnswer } from './practice';
import type { CurriculumUnit } from './curriculum';
export type TransferItem = NonNullable<CurriculumUnit['transferDrills']>[number];
export type TransferQuestion = Pick<TransferItem, 'id' | 'tag' | 'prompt'> & {
  unitId: string;
  version: number;
};
export function gradeTransfer(
  item: Pick<TransferItem, 'answers' | 'explanation'> & { tag?: TransferItem['tag'] },
  answer: string,
  box: number,
  misses: number,
) {
  // Capital letters are the target of capitalization drills, so they must match exactly.
  const caseSensitive = item.tag === 'capitalization';
  const accepted = item.answers.find((candidate) =>
    matchesPracticeAnswer(answer, candidate, caseSensitive),
  );
  const suggestion = accepted ?? item.answers[0];
  const result = checkPracticeAnswer(answer, suggestion, box, misses, { caseSensitive });
  return { ...result, ...(result.complete ? { suggestion, explanation: item.explanation } : {}) };
}
