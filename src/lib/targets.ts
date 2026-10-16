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
// Growth targets stay off unless the server sets GROWTH_TARGETS=true.
export function growthTargetsEnabled(): boolean {
  return process.env.GROWTH_TARGETS === 'true';
}
// Saved reports from earlier grading must not drive the UI while the switch is off.
export function visibleFeedback<T extends { target_report?: unknown }>(feedback: T): T {
  if (growthTargetsEnabled()) return feedback;
  const { target_report: hidden, ...ordinary } = feedback;
  void hidden;
  return ordinary as T;
}
export function targetsForUnit(unit: Pick<CurriculumUnit, 'id' | 'grammarFocus'>): Tag[] {
  if (!growthTargetsEnabled() || trackForId(unit.id) !== 'core') return [];
  return [...new Set(unit.grammarFocus)].filter((tag) => !feedbackOnly.has(tag)).slice(0, 2);
}
type ReportedUse = { tag: Tag; uses: number };
// The model reports only uses. Errors and indexes come from its own same-tag corrections.
export function validateTargetReport<T extends Omit<Feedback, 'target_report'>>(
  feedback: T & { target_report?: ReportedUse[] },
  targets: Tag[],
): T & Pick<Feedback, 'target_report'> {
  const { target_report: submitted, ...ordinary } = feedback;
  const report = deriveTargetReport(ordinary, submitted, targets);
  return { ...ordinary, ...(report ? { target_report: report } : {}) } as T &
    Pick<Feedback, 'target_report'>;
}
function deriveTargetReport(
  feedback: Pick<Feedback, 'safety_flag' | 'corrections'>,
  submitted: ReportedUse[] | undefined,
  targets: Tag[],
): Feedback['target_report'] {
  if (feedback.safety_flag || !targets.length) return undefined;
  return targets.map((tag) => {
    const indexes = feedback.corrections.flatMap((correction, index) =>
      correction.tag === tag && correction.severity !== 'style' && correction.confidence >= 0.7
        ? [index]
        : [],
    );
    const uses = submitted?.find((item) => item.tag === tag)?.uses ?? 0;
    return {
      tag,
      uses: Math.max(uses, indexes.length),
      errors: indexes.length,
      correction_indexes: indexes,
    };
  });
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
