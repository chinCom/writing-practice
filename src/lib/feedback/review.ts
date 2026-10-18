import type { CorrectionChoice } from './choices';
import type { LocatedFeedback } from './schema';
import { targetCorrectionIndexes } from '@/lib/revision';

export function correctionReviewState(
  feedback: LocatedFeedback,
  choices: CorrectionChoice[],
  answersUnlocked: boolean,
) {
  const targets = targetCorrectionIndexes(feedback);
  const hiddenAnswers = new Set(
    [...targets].filter(
      (index) =>
        !answersUnlocked &&
        !choices.some((choice) => choice.correctionIndex === index && choice.revealed),
    ),
  );
  const applied = new Set(
    choices.filter((choice) => choice.status === 'applied').map((choice) => choice.correctionIndex),
  );
  const rewriteAvailable =
    !targets.size || answersUnlocked || choices.some((choice) => choice.revealed);
  return { hiddenAnswers, applied, rewriteAvailable };
}

export function nextOpenCorrection(active: number, total: number, choices: CorrectionChoice[]) {
  return Array.from(
    { length: Math.max(0, total - 1) },
    (_, offset) => (active + offset + 1) % total,
  ).find(
    (index) =>
      !choices.some(
        (choice) =>
          choice.correctionIndex === index &&
          (choice.status === 'applied' || choice.status === 'dismissed'),
      ),
  );
}

export function visibleCorrectionIndexes(active: number, total: number) {
  if (!total) return [];
  const windowStart = Math.min(Math.max(0, active - 1), Math.max(0, total - 3));
  const nearby = Array.from(
    { length: Math.min(3, total - windowStart) },
    (_, offset) => windowStart + offset,
  ).filter((index) => index !== active);
  return [active, ...nearby];
}
