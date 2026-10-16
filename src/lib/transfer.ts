import { checkPracticeAnswer, normalizePracticeAnswer } from './practice';
import type { CurriculumUnit } from './curriculum';
export type TransferItem = NonNullable<CurriculumUnit['transferDrills']>[number];
export type TransferQuestion = Pick<TransferItem, 'id' | 'tag' | 'prompt'> & {
  unitId: string;
  version: number;
};
export function gradeTransfer(
  item: Pick<TransferItem, 'answers' | 'explanation'>,
  answer: string,
  box: number,
  misses: number,
) {
  const accepted = item.answers.find(
    (candidate) => normalizePracticeAnswer(candidate) === normalizePracticeAnswer(answer),
  );
  const suggestion = accepted ?? item.answers[0];
  const result = checkPracticeAnswer(answer, suggestion, box, misses);
  return { ...result, ...(result.complete ? { suggestion, explanation: item.explanation } : {}) };
}
