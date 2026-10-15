import { trackForId, type CurriculumUnit } from './curriculum';
import { locateCorrections } from './feedback/locate';
import { type Feedback, type LocatedFeedback, type ErrorTag } from './feedback/schema';
import type { z } from 'zod';

type Tag = z.infer<typeof ErrorTag>;
// Discourse and broad vocabulary tags do not have countable obligatory contexts.
const feedbackOnly = new Set<Tag>([
  'word-choice',
  'collocation',
  'false-friend',
  'word-form',
  'register',
  'repetition',
  'cohesion',
  'paragraphing',
  'topic-sentence',
  'task-response',
  'off-topic',
  'too-short',
  'tone-formality',
]);
export function targetsForUnit(unit: CurriculumUnit): Tag[] {
  if (trackForId(unit.id) !== 'core') return [];
  return [...new Set(unit.grammarFocus)].filter((tag) => !feedbackOnly.has(tag)).slice(0, 2);
}
export function validateTargetReport<T extends Feedback>(feedback: T, targets: Tag[]): T {
  const report = feedback.target_report;
  const valid =
    !feedback.safety_flag &&
    targets.length > 0 &&
    report?.length === targets.length &&
    new Set(report.map((item) => item.tag)).size === report.length &&
    report.every((item) => {
      const indexes = item.correction_indexes;
      const corrections = feedback.corrections;
      return (
        targets.includes(item.tag) &&
        item.errors <= item.uses &&
        item.errors === indexes.length &&
        new Set(indexes).size === indexes.length &&
        indexes.every(
          (index) =>
            corrections[index]?.tag === item.tag && corrections[index].severity !== 'style',
        ) &&
        corrections.every(
          (correction, index) =>
            correction.tag !== item.tag ||
            correction.severity === 'style' ||
            indexes.includes(index),
        )
      );
    });
  if (valid) return feedback;
  const { target_report: discarded, ...ordinary } = feedback;
  void discarded;
  return ordinary as T;
}
export function locateFeedback(text: string, feedback: Feedback): LocatedFeedback {
  const corrections = locateCorrections(text, feedback.corrections);
  const used = new Set<number>();
  const originalIndexes = corrections.map(({ start, end, ...correction }) => {
    void start;
    void end;
    const index = feedback.corrections.findIndex(
      (candidate, index) =>
        !used.has(index) && JSON.stringify(candidate) === JSON.stringify(correction),
    );
    used.add(index);
    return index;
  });
  const report = feedback.target_report;
  const survived = report?.every((item) =>
    item.correction_indexes.every((index) => originalIndexes.includes(index)),
  );
  const { target_report: discarded, ...ordinary } = feedback;
  void discarded;
  return {
    ...ordinary,
    corrections,
    ...(survived
      ? {
          target_report: report!.map((item) => ({
            ...item,
            correction_indexes: item.correction_indexes.map((index) =>
              originalIndexes.indexOf(index),
            ),
          })),
        }
      : {}),
  };
}
