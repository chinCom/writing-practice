import { expect, it } from 'vitest';
import { evaluateCorrections, summarizeEvaluations } from '@/lib/evaluation';

it('matches expected corrections once and counts unsupported or wrong fixes as false positives', () => {
  const expected = [{ original: 'go', suggestions: ['went'] }];
  const corrections = [
    { original: 'go', suggestion: 'went', confidence: 0.9, severity: 'major' },
    { original: 'go', suggestion: 'went', confidence: 0.9, severity: 'major' },
    { original: 'hat', suggestion: 'cap', confidence: 0.9, severity: 'style' },
    { original: 'hat', suggestion: 'hats', confidence: 0.5, severity: 'minor' },
  ];
  expect(evaluateCorrections(expected, corrections)).toEqual({
    truePositives: 1,
    falsePositives: 1,
    falseNegatives: 0,
  });
  expect(evaluateCorrections(expected, [{ ...corrections[0], suggestion: 'gone' }])).toEqual({
    truePositives: 0,
    falsePositives: 1,
    falseNegatives: 1,
  });
});

it('recognizes the same minimal fix inside a longer exact snippet', () => {
  expect(
    evaluateCorrections(
      [{ original: 'go', suggestions: ['went'] }],
      [
        {
          original: 'I go to the beach',
          suggestion: 'I went to the beach',
          confidence: 0.9,
          severity: 'major',
        },
      ],
    ),
  ).toEqual({ truePositives: 1, falsePositives: 0, falseNegatives: 0 });
  expect(
    evaluateCorrections(
      [{ original: 'go', suggestions: ['went'] }],
      [{ original: 'I go', suggestion: 'He went', confidence: 0.9, severity: 'major' }],
    ),
  ).toEqual({ truePositives: 0, falsePositives: 1, falseNegatives: 1 });
});

it('reports clean-text failures and invalid outputs without treating failed calls as clean success', () => {
  const results = [
    {
      id: 'error',
      expectedCount: 2,
      valid: true,
      truePositives: 1,
      falsePositives: 1,
      falseNegatives: 1,
      promptTokens: 100,
      completionTokens: 50,
      latencyMs: 1000,
    },
    {
      id: 'clean',
      expectedCount: 0,
      valid: true,
      truePositives: 0,
      falsePositives: 1,
      falseNegatives: 0,
      promptTokens: 100,
      completionTokens: 50,
      latencyMs: 1000,
    },
    {
      id: 'failed-clean',
      expectedCount: 0,
      valid: false,
      truePositives: 0,
      falsePositives: 0,
      falseNegatives: 0,
      promptTokens: 0,
      completionTokens: 0,
      latencyMs: 0,
    },
  ];
  const summary = summarizeEvaluations(results);
  expect(summary.precision).toBeCloseTo(1 / 3);
  expect(summary.recall).toBe(0.5);
  expect(summary.jsonValidityRate).toBeCloseTo(2 / 3);
  expect(summary.cleanTextFalsePositiveRate).toBe(1);
  expect(summary.validCleanTexts).toBe(1);
  expect(summary.averageTokens).toBe(150);
  expect(summary.averageLatencyMs).toBe(1000);
});
