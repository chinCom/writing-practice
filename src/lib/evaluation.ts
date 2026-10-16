import { ErrorTag, type Feedback } from './feedback/schema';
import { z } from 'zod';
import { taskSchema } from './curriculum';
import { locateFeedback, validateTargetReport } from './targets';

export const targetStudyCaseSchema = z
  .strictObject({
    id: z.string().min(1).max(80),
    level: z.enum(['A1', 'A2', 'B1']),
    annotation: z.enum(['human', 'synthetic']),
    annotator: z.string().trim().min(1).max(100),
    secondCheckedBy: z.string().trim().min(1).max(100).optional(),
    expectedTaskScore: z.number().int().min(0).max(5),
    text: z.string().min(1).max(6500),
    task: taskSchema,
    targets: z
      .array(
        z.strictObject({
          tag: ErrorTag,
          uses: z.number().int().min(0).max(100),
          expected: z
            .array(
              z.strictObject({
                original: z.string().min(1).max(300),
                suggestions: z.array(z.string().min(1).max(300)).min(1),
              }),
            )
            .max(100),
        }),
      )
      .min(1)
      .max(2),
  })
  .superRefine((sample, context) => {
    if (
      sample.task.targetLevel !== sample.level ||
      sample.task.isCheckpoint ||
      sample.targets.some((target) => target.uses < target.expected.length) ||
      new Set(sample.targets.map((target) => target.tag)).size !== sample.targets.length
    )
      context.addIssue({
        code: 'custom',
        message: 'Inconsistent target annotations or non-standard task.',
      });
  });

// Provisional AI reviews have a separate input contract and can never become human gold.
export const aiTargetDiagnosticCaseSchema = z
  .strictObject({
    id: targetStudyCaseSchema.shape.id,
    level: targetStudyCaseSchema.shape.level,
    annotator: targetStudyCaseSchema.shape.annotator,
    expectedTaskScore: targetStudyCaseSchema.shape.expectedTaskScore,
    text: targetStudyCaseSchema.shape.text,
    task: taskSchema,
    annotation: z.literal('ai-reviewed'),
    reviewStatus: z.literal('provisional-not-human-gold'),
    taskNote: z.string(),
    targets: z
      .array(
        z.strictObject({
          tag: ErrorTag,
          usesEstimate: z.number().int().min(0).max(100),
          expected: targetStudyCaseSchema.shape.targets.element.shape.expected,
          withheldCorrections: z.array(
            z.strictObject({
              original: z.string(),
              suggestion: z.string(),
              reason: z.string(),
            }),
          ),
          reviewNote: z.string(),
        }),
      )
      .min(1)
      .max(2),
  })
  .superRefine((sample, context) => {
    if (
      sample.task.targetLevel !== sample.level ||
      sample.task.isCheckpoint ||
      new Set(sample.targets.map((target) => target.tag)).size !== sample.targets.length ||
      sample.targets.some((target) => target.expected.length > target.usesEstimate)
    )
      context.addIssue({
        code: 'custom',
        message: 'Inconsistent provisional annotations or task.',
      });
  })
  .transform((sample) => ({
    ...sample,
    targets: sample.targets.map(({ tag, usesEstimate, expected }) => ({
      tag,
      uses: usesEstimate,
      expected,
    })),
  }));

export interface ExpectedCorrection {
  original: string;
  suggestions: string[];
}
export interface EvaluatedCorrection {
  original: string;
  suggestion: string;
  confidence: number;
  severity: string;
}
export interface EvaluationResult {
  id: string;
  expectedCount: number;
  valid: boolean;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
}
function normalized(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}
function matchesFix(expected: ExpectedCorrection, correction: EvaluatedCorrection) {
  const original = normalized(correction.original);
  const suggestion = normalized(correction.suggestion);
  const target = normalized(expected.original);
  for (
    let start = original.indexOf(target);
    start >= 0;
    start = original.indexOf(target, start + 1)
  ) {
    const end = start + target.length;
    if (/[a-z0-9]/i.test(original[start - 1] ?? '') || /[a-z0-9]/i.test(original[end] ?? ''))
      continue;
    if (
      expected.suggestions.some(
        (fix) => original.slice(0, start) + normalized(fix) + original.slice(end) === suggestion,
      )
    )
      return true;
  }
  return false;
}
export function evaluateCorrections(
  expected: ExpectedCorrection[],
  corrections: EvaluatedCorrection[],
) {
  const unmatched = new Set(expected.map((_, index) => index));
  let truePositives = 0;
  let falsePositives = 0;
  for (const correction of corrections) {
    // Optional style changes and uncertain suggestions are not error claims.
    if (correction.severity === 'style' || correction.confidence < 0.7) continue;
    const match = expected.findIndex(
      (item, index) => unmatched.has(index) && matchesFix(item, correction),
    );
    if (match < 0) falsePositives++;
    else {
      truePositives++;
      unmatched.delete(match);
    }
  }
  return { truePositives, falsePositives, falseNegatives: unmatched.size };
}
export function summarizeEvaluations(results: EvaluationResult[]) {
  const valid = results.filter((result) => result.valid);
  const clean = valid.filter((result) => result.expectedCount === 0);
  const totals = results.reduce(
    (total, result) => ({
      truePositives: total.truePositives + result.truePositives,
      falsePositives: total.falsePositives + result.falsePositives,
      falseNegatives: total.falseNegatives + result.falseNegatives,
    }),
    { truePositives: 0, falsePositives: 0, falseNegatives: 0 },
  );
  const ratio = (numerator: number, denominator: number) =>
    denominator ? numerator / denominator : null;
  return {
    cases: results.length,
    ...totals,
    precision: ratio(totals.truePositives, totals.truePositives + totals.falsePositives),
    recall: ratio(totals.truePositives, totals.truePositives + totals.falseNegatives),
    jsonValidityRate: ratio(valid.length, results.length),
    validCleanTexts: clean.length,
    cleanTextFalsePositiveRate: ratio(
      clean.filter((result) => result.falsePositives > 0).length,
      clean.length,
    ),
    averageTokens: ratio(
      valid.reduce((sum, result) => sum + result.promptTokens + result.completionTokens, 0),
      valid.length,
    ),
    averageLatencyMs: ratio(
      valid.reduce((sum, result) => sum + result.latencyMs, 0),
      valid.length,
    ),
  };
}

export interface TargetStudyCase {
  id: string;
  level: 'A1' | 'A2' | 'B1';
  annotation: 'human' | 'synthetic' | 'ai-reviewed';
  annotator: string;
  expectedTaskScore: number;
  text: string;
  secondCheckedBy?: string;
  targets: {
    tag: z.infer<typeof ErrorTag>;
    uses: number;
    expected: ExpectedCorrection[];
  }[];
}
export interface TargetStudyRun {
  id: string;
  run: number;
  graderVersion: string;
  feedback: Feedback | null;
}
const rubricKeys = ['task', 'organization', 'grammar', 'vocabulary'] as const;
function sampleVariance(values: number[]) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
}
function pooledNoise(variances: number[]) {
  return variances.length
    ? Math.sqrt(variances.reduce((sum, value) => sum + value, 0) / variances.length)
    : null;
}
// Repeated measurements of the same text estimate noise, not differences between learners.
export function summarizeTargetStudy(cases: TargetStudyCase[], runs: TargetStudyRun[]) {
  const versions = [...new Set(runs.map((run) => run.graderVersion))];
  let complete =
    cases.length > 0 &&
    new Set(cases.map((sample) => sample.id)).size === cases.length &&
    runs.length === cases.length * 3 &&
    versions.length === 1 &&
    Boolean(versions[0]);
  let truePositives = 0;
  let falsePositives = 0;
  let disagreements = 0;
  let humanDisagreements = 0;
  let validRuns = 0;
  const scoreVariances: Record<string, number[]> = Object.fromEntries(
    rubricKeys.map((key) => [key, []]),
  );
  const targetVariances: Record<string, number[]> = {};
  for (const sample of cases) {
    const group = runs.filter((run) => run.id === sample.id);
    const tags = sample.targets.map((target) => target.tag);
    if (
      tags.length < 1 ||
      tags.length > 2 ||
      new Set(tags).size !== tags.length ||
      sample.targets.some((target) => target.uses < target.expected.length)
    )
      complete = false;
    if (group.length !== 3 || ![1, 2, 3].every((number) => group.some((run) => run.run === number)))
      complete = false;
    const located = group.map((run) => ({
      ...run,
      feedback: run.feedback
        ? validateTargetReport(locateFeedback(sample.text, run.feedback), tags)
        : null,
    }));
    const valid = located.filter((run) => run.feedback?.target_report);
    if (valid.length !== 3) complete = false;
    const humanPass =
      sample.expectedTaskScore >= 2 &&
      sample.targets.every(
        (target) => target.uses > 0 && target.expected.length <= Math.max(1, target.uses * 0.2),
      );
    const passResults: boolean[] = [];
    for (const run of valid) {
      const feedback = run.feedback!;
      validRuns++;
      const passes =
        feedback.scores.task >= 2 &&
        feedback.target_report!.every(
          (target) => target.uses > 0 && target.errors <= Math.max(1, target.uses * 0.2),
        );
      passResults.push(passes);
      if (passes !== humanPass) humanDisagreements++;
      for (const target of sample.targets) {
        const report = feedback.target_report!.find((item) => item.tag === target.tag)!;
        const counts = evaluateCorrections(
          target.expected,
          report.correction_indexes.map((index) => feedback.corrections[index]),
        );
        truePositives += counts.truePositives;
        falsePositives += counts.falsePositives;
      }
    }
    if (valid.length === 3) {
      const passCount = passResults.filter(Boolean).length;
      disagreements += Math.min(passCount, 3 - passCount);
      for (const key of rubricKeys)
        scoreVariances[key].push(sampleVariance(valid.map((run) => run.feedback!.scores[key])));
      for (const tag of tags) {
        const reports = valid.map((run) =>
          run.feedback!.target_report!.find((item) => item.tag === tag)!,
        );
        if (reports.every((report) => report.uses > 0)) {
          (targetVariances[tag] ??= []).push(
            sampleVariance(reports.map((report) => report.errors / report.uses)),
          );
        }
      }
    }
  }
  const precision =
    truePositives + falsePositives ? truePositives / (truePositives + falsePositives) : null;
  const passDisagreementRate = validRuns ? disagreements / validRuns : null;
  const humanPassDisagreementRate = validRuns ? humanDisagreements / validRuns : null;
  const humanReviewed = cases.every(
    (sample) => sample.annotation === 'human' && sample.annotator.trim(),
  );
  const secondChecked = cases.filter(
    (sample) => sample.secondCheckedBy?.trim() && sample.secondCheckedBy !== sample.annotator,
  ).length;
  const coverage = new Set(cases.flatMap((sample) => sample.targets.map((target) => target.tag)));
  const corpusReady =
    complete &&
    humanReviewed &&
    cases.length >= 40 &&
    secondChecked >= Math.ceil(cases.length / 4) &&
    ['A1', 'A2', 'B1'].every((level) => cases.some((sample) => sample.level === level)) &&
    ['connectors', 'verb-tense', 'prepositions', 'modal-verbs', 'punctuation'].every((tag) =>
      coverage.has(tag as z.infer<typeof ErrorTag>),
    );
  return {
    cases: cases.length,
    validRuns,
    complete,
    graderVersion: versions.length === 1 ? versions[0] : null,
    truePositives,
    falsePositives,
    precision,
    passDisagreementRate,
    referencePassDisagreementRate: humanPassDisagreementRate,
    humanPassDisagreementRate: humanReviewed ? humanPassDisagreementRate : null,
    secondChecked,
    gatePassed:
      corpusReady &&
      precision !== null &&
      precision >= 0.85 &&
      passDisagreementRate !== null &&
      passDisagreementRate <= 0.1 &&
      humanPassDisagreementRate !== null &&
      humanPassDisagreementRate <= 0.1,
    noiseReady: complete && humanReviewed && cases.length >= 30,
    noise: {
      scores: Object.fromEntries(rubricKeys.map((key) => [key, pooledNoise(scoreVariances[key])])),
      targetRates: Object.fromEntries(
        Object.entries(targetVariances).map(([tag, variances]) => [tag, pooledNoise(variances)]),
      ),
    },
  };
}
