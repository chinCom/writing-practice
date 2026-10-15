import type { Feedback, LocatedCorrection } from '@/lib/feedback/schema';

export const scoreKeys = ['task', 'organization', 'grammar', 'vocabulary'] as const;
export type ScoreKey = (typeof scoreKeys)[number];
export type CheckEvent = {
  id: string;
  at: string;
  attempt: number;
  parentId: string | null;
  words: number;
  scores: Feedback['scores'];
  corrections: Pick<LocatedCorrection, 'confidence' | 'severity'>[];
};
export type SkillSnapshot = Record<ScoreKey, number> & {
  average: number;
  errorsPer100Words: number;
};
export type Improvement = {
  firstChecks: number;
  checksNeeded: number;
  weekly: ({ weekStart: string; checks: number } & SkillSnapshot)[];
  thenVsNow: { then: SkillSnapshot; now: SkillSnapshot } | null;
  revisionGain: { pairs: number; averageDelta: number } | null;
};

// Compare the first three and the latest three first attempts, so one check cannot set a trend.
const compareSize = 3;
const dayMilliseconds = 86400000;
const roundOne = (value: number) => Math.round(value * 10) / 10;

function countedErrors(check: CheckEvent) {
  return check.corrections.filter(
    (correction) => correction.confidence >= 0.7 && correction.severity !== 'style',
  ).length;
}
function averageScore(scores: Feedback['scores']) {
  return scoreKeys.reduce((sum, key) => sum + scores[key], 0) / scoreKeys.length;
}
function mean(checks: CheckEvent[], pick: (check: CheckEvent) => number) {
  return roundOne(checks.reduce((sum, check) => sum + pick(check), 0) / checks.length);
}
function snapshot(checks: CheckEvent[]): SkillSnapshot {
  const words = checks.reduce((sum, check) => sum + check.words, 0);
  const errors = checks.reduce((sum, check) => sum + countedErrors(check), 0);
  return {
    task: mean(checks, (check) => check.scores.task),
    organization: mean(checks, (check) => check.scores.organization),
    grammar: mean(checks, (check) => check.scores.grammar),
    vocabulary: mean(checks, (check) => check.scores.vocabulary),
    average: mean(checks, (check) => averageScore(check.scores)),
    errorsPer100Words: words ? roundOne((errors / words) * 100) : 0,
  };
}
export function weekStartUtc(at: string) {
  const day = new Date(at.slice(0, 10) + 'T00:00:00Z');
  const monday = day.getTime() - ((day.getUTCDay() + 6) % 7) * dayMilliseconds;
  return new Date(monday).toISOString().slice(0, 10);
}
export function summarizeImprovement(checks: CheckEvent[], now = new Date()): Improvement {
  const past = checks
    .filter((check) => new Date(check.at) <= now)
    .sort((a, b) => a.at.localeCompare(b.at));
  const firstAttempts = past.filter((check) => check.attempt === 1);
  const weeks = new Map<string, CheckEvent[]>();
  for (const check of firstAttempts) {
    const key = weekStartUtc(check.at);
    weeks.set(key, [...(weeks.get(key) ?? []), check]);
  }
  const byId = new Map(past.map((check) => [check.id, check]));
  const deltas = past.flatMap((check) => {
    const parent = check.parentId ? byId.get(check.parentId) : undefined;
    return check.attempt > 1 && parent
      ? [averageScore(check.scores) - averageScore(parent.scores)]
      : [];
  });
  const enough = firstAttempts.length >= compareSize * 2;
  return {
    firstChecks: firstAttempts.length,
    checksNeeded: Math.max(0, compareSize * 2 - firstAttempts.length),
    weekly: [...weeks].map(([weekStart, events]) => ({
      weekStart,
      checks: events.length,
      ...snapshot(events),
    })),
    thenVsNow: enough
      ? {
          then: snapshot(firstAttempts.slice(0, compareSize)),
          now: snapshot(firstAttempts.slice(-compareSize)),
        }
      : null,
    revisionGain: deltas.length
      ? {
          pairs: deltas.length,
          averageDelta: roundOne(deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length),
        }
      : null,
  };
}
