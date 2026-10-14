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
