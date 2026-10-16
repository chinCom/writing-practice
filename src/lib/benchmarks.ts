import type { CurriculumUnit } from './curriculum';
import type { Feedback } from './feedback/schema';
import { scoreKeys } from './improvement';

export type BenchmarkContext = {
  unitId: string;
  contentHash: string;
  role: 'baseline' | 'checkpoint';
  minWords: number;
  maxWords: number;
};
export function benchmarkContextForTask(
  unit: CurriculumUnit,
  contentHash: string,
  taskId: string,
): BenchmarkContext | null {
  if (unit.id.startsWith('ielts-') || !unit.parallelPrompt || !contentHash) return null;
  const role =
    taskId === unit.lessons[0].task.id
      ? 'baseline'
      : taskId === unit.parallelPrompt.id
        ? 'checkpoint'
        : null;
  return role
    ? {
        unitId: unit.id,
        contentHash,
        role,
        minWords: unit.parallelPrompt.minWords,
        maxWords: unit.parallelPrompt.maxWords,
      }
    : null;
}
export type BenchmarkCheck = {
  id: string;
  at: string;
  attempt: number;
  safety: boolean;
  version: string;
  context: BenchmarkContext | null;
  text: string;
  scores: Feedback['scores'];
  targets?: Feedback['target_report'];
};
export type BenchmarkNoise = {
  version: string;
  humanReviewed: true;
  precisionPassed: true;
  texts: number;
  runsPerText: 3;
  scoreSd: number;
  targetSd: Partial<Record<NonNullable<Feedback['target_report']>[number]['tag'], number>>;
};
export type MeasuredChange = 'uncalibrated' | 'about-same' | 'higher' | 'lower';

function mtldDirection(tokens: string[]) {
  const types = new Set<string>();
  let length = 0;
  let factors = 0;
  for (const token of tokens) {
    types.add(token);
    length++;
    if (types.size / length <= 0.72) {
      factors++;
      types.clear();
      length = 0;
    }
  }
  if (length) factors += (1 - types.size / length) / (1 - 0.72);
  return factors > 0 ? tokens.length / factors : null;
}
export function writingIndicators(text: string, minWords: number, maxWords: number) {
  const words = [...text.matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)].map((word) =>
    word[0].toLowerCase(),
  );
  const sentences = text
    .split(/[.!?]+/u)
    .filter((sentence) => /[\p{L}\p{N}]/u.test(sentence)).length;
  const forward = words.length >= 50 ? mtldDirection(words) : null;
  const backward = words.length >= 50 ? mtldDirection([...words].reverse()) : null;
  return {
    words: words.length,
    inRange: words.length >= minWords && words.length <= maxWords,
    meanSentenceLength: sentences ? words.length / sentences : null,
    mtld: forward !== null && backward !== null ? (forward + backward) / 2 : null,
  };
}
function score(check: BenchmarkCheck) {
  return scoreKeys.reduce((sum, key) => sum + check.scores[key], 0) / scoreKeys.length;
}
function change(delta: number | null, sd: number | undefined): MeasuredChange {
  if (delta === null || sd === undefined || !Number.isFinite(sd) || sd < 0) return 'uncalibrated';
  if (Math.abs(delta) <= 2 * sd) return 'about-same';
  return delta > 0 ? 'higher' : 'lower';
}
export function summarizeBenchmarks(checks: BenchmarkCheck[], noise?: BenchmarkNoise) {
  const eligible = checks
    .filter((check) => check.context && check.attempt === 1 && !check.safety)
    .sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  const seen = new Set<string>();
  return eligible.flatMap((checkpoint) => {
    const context = checkpoint.context!;
    if (context.role !== 'checkpoint') return [];
    const key = JSON.stringify([context.unitId, context.contentHash, checkpoint.version]);
    if (seen.has(key)) return [];
    const baseline = eligible.find(
      (check) =>
        check.context?.role === 'baseline' &&
        check.context.unitId === context.unitId &&
        check.context.contentHash === context.contentHash &&
        check.version === checkpoint.version &&
        check.at < checkpoint.at,
    );
    if (!baseline) return [];
    seen.add(key);
    const calibrated =
      noise?.humanReviewed === true &&
      noise.precisionPassed === true &&
      noise.texts >= 30 &&
      noise.runsPerText === 3 &&
      noise.version === checkpoint.version;
    const scoreDelta = score(checkpoint) - score(baseline);
    return [
      {
        unitId: context.unitId,
        version: checkpoint.version,
        before: score(baseline),
        after: score(checkpoint),
        scoreDelta,
        scoreChange: change(scoreDelta, calibrated ? noise.scoreSd : undefined),
        targets: (baseline.targets ?? []).flatMap((target) => {
          const after = checkpoint.targets?.find((item) => item.tag === target.tag);
          if (!after) return [];
          const beforeRate = target.uses ? target.errors / target.uses : null;
          const afterRate = after.uses ? after.errors / after.uses : null;
          return [
            {
              tag: target.tag,
              before: beforeRate,
              after: afterRate,
              change: change(
                beforeRate !== null && afterRate !== null ? afterRate - beforeRate : null,
                calibrated ? noise.targetSd[target.tag] : undefined,
              ),
            },
          ];
        }),
        indicators: {
          before: writingIndicators(baseline.text, context.minWords, context.maxWords),
          after: writingIndicators(checkpoint.text, context.minWords, context.maxWords),
        },
      },
    ];
  });
}
export type BenchmarkComparison = ReturnType<typeof summarizeBenchmarks>[number];
