import { passesCheckpoint } from './curriculum';
import type { Feedback, ErrorTag } from './feedback/schema';
import type { z } from 'zod';

type Tag = z.infer<typeof ErrorTag>;
export type MasteryAssessment = {
  outcome: 'mastery' | 'carry-forward' | 'revise' | 'unknown' | 'blocked' | 'checkpoint';
  carried: Tag[];
};
export type AdvisoryTarget = { tag: Tag; source: 'unit' | 'carried' };

// These recommendations never control unlocking. Human precision and noise gates remain closed.
export function assessMastery({
  targets,
  feedback,
  attempt,
  isCheckpoint,
  baseline = [],
}: {
  targets: Tag[];
  feedback: Pick<Feedback, 'safety_flag' | 'scores' | 'target_report'>;
  attempt: number;
  isCheckpoint: boolean;
  baseline?: { tag: Tag; uses: number }[];
}): MasteryAssessment {
  const result = (outcome: MasteryAssessment['outcome'], carried: Tag[] = []) => ({
    outcome,
    carried,
  });
  if (feedback.safety_flag || feedback.scores.task < 2) return result('blocked');
  if (isCheckpoint)
    return result(passesCheckpoint(feedback.scores, false) ? 'checkpoint' : 'blocked');
  const report = feedback.target_report;
  if (
    !targets.length ||
    !report ||
    report.length !== targets.length ||
    new Set(report.map((item) => item.tag)).size !== targets.length ||
    !targets.every((tag) => report.some((item) => item.tag === tag))
  )
    return result('unknown');
  const missed = targets.filter((tag) => {
    const item = report.find((item) => item.tag === tag)!;
    const first = baseline.find((item) => item.tag === tag);
    return (
      item.uses === 0 ||
      (first !== undefined && item.uses < first.uses / 2) ||
      item.errors > Math.max(1, item.uses * 0.2)
    );
  });
  if (!missed.length) return result('mastery');
  if (attempt >= 3) return result('carry-forward', missed);
  return result('revise');
}

export function advisoryTargets(focus: Tag[], carried: Tag[]): AdvisoryTarget[] {
  const targets: AdvisoryTarget[] = [];
  for (const tag of focus) {
    if (!targets.some((target) => target.tag === tag)) targets.push({ tag, source: 'unit' });
  }
  for (const tag of carried) {
    if (!targets.some((target) => target.tag === tag)) targets.push({ tag, source: 'carried' });
  }
  return targets.slice(0, 2);
}
