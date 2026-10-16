import { expect, it } from 'vitest';
import {
  evaluateCorrections,
  summarizeEvaluations,
  summarizeTargetStudy,
  targetStudyCaseSchema,
  aiTargetDiagnosticCaseSchema,
  type TargetStudyCase,
  type TargetStudyRun,
} from '@/lib/evaluation';
import { FeedbackSchema } from '@/lib/feedback/schema';
import { feedback as feedbackFixture } from './fixtures/feedback';
import { weekendTask } from '@/lib/curriculum';

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

// Synthetic annotations test arithmetic, never satisfy the real-human study gate.
it('keeps incomplete or synthetic target studies gated despite perfect precision', () => {
  const sample: TargetStudyCase = {
    id: 'synthetic',
    level: 'A2',
    annotation: 'synthetic',
    annotator: 'fixture',
    expectedTaskScore: 3,
    text: 'I goed home.',
    targets: [
      { tag: 'verb-tense', uses: 4, expected: [{ original: 'goed', suggestions: ['went'] }] },
    ],
  };
  const output = FeedbackSchema.parse({
    ...feedbackFixture,
    target_report: [{ tag: 'verb-tense', uses: 4, errors: 1, correction_indexes: [0] }],
  });
  const runs: TargetStudyRun[] = [1, 2, 3].map((run) => ({
    id: sample.id,
    run,
    graderVersion: 'pinned:v3',
    feedback: output,
  }));
  const report = summarizeTargetStudy([sample], runs);
  expect(report.precision).toBe(1);
  expect(report.passDisagreementRate).toBe(0);
  expect(report.gatePassed).toBe(false);
  expect(report.noiseReady).toBe(false);
  expect(report.noise.scores.grammar).toBe(0);
  expect(report.noise.targetRates['verb-tense']).toBe(0);
  expect(summarizeTargetStudy([sample], runs.slice(0, 2)).complete).toBe(false);
  expect(
    summarizeTargetStudy([sample], [{ ...runs[0], feedback: null }, ...runs.slice(1)]).complete,
  ).toBe(false);
  expect(
    summarizeTargetStudy([sample], [{ ...runs[0], graderVersion: 'other' }, ...runs.slice(1)])
      .complete,
  ).toBe(false);
});
it('counts target false positives, pass disagreements, and within-text noise', () => {
  const sample: TargetStudyCase = {
    id: 'one',
    level: 'A1',
    annotation: 'synthetic',
    annotator: 'fixture',
    expectedTaskScore: 3,
    text: 'I goed home. Yesterday I go to school.',
    targets: [{ tag: 'verb-tense', uses: 4, expected: [] }],
  };
  const clean = FeedbackSchema.parse({
    ...feedbackFixture,
    corrections: [],
    target_report: [{ tag: 'verb-tense', uses: 4, errors: 0, correction_indexes: [] }],
  });
  const noisy = FeedbackSchema.parse({
    ...feedbackFixture,
    corrections: [
      feedbackFixture.corrections[0],
      { ...feedbackFixture.corrections[0], original: 'go', suggestion: 'went' },
    ],
    scores: { ...clean.scores, grammar: 4 },
    target_report: [{ tag: 'verb-tense', uses: 4, errors: 2, correction_indexes: [0, 1] }],
  });
  const report = summarizeTargetStudy(
    [sample],
    [clean, clean, noisy].map((feedback, index) => ({
      id: 'one',
      run: index + 1,
      graderVersion: 'pinned:v3',
      feedback,
    })),
  );
  expect(report.precision).toBe(0);
  expect(report.passDisagreementRate).toBeCloseTo(1 / 3);
  expect(report.noise.scores.grammar).toBeCloseTo(Math.sqrt(4 / 3));
  expect(report.noise.targetRates['verb-tense']).toBeCloseTo(Math.sqrt(1 / 12));
  expect(report.gatePassed).toBe(false);
});

it('distinguishes run instability from human agreement and rejects inconsistent annotations', () => {
  const sample: TargetStudyCase = {
    id: 'stable-wrong',
    text: 'I goed home.',
    level: 'A2',
    annotation: 'synthetic',
    annotator: 'fixture',
    expectedTaskScore: 1,
    targets: [{ tag: 'verb-tense', uses: 4, expected: [] }],
  };
  const output = FeedbackSchema.parse({
    ...feedbackFixture,
    corrections: [],
    target_report: [{ tag: 'verb-tense', uses: 4, errors: 0, correction_indexes: [] }],
  });
  const runs = [1, 2, 3].map((run) => ({
    id: sample.id,
    run,
    graderVersion: 'pinned',
    feedback: output,
  }));
  const report = summarizeTargetStudy([sample], runs);
  expect(report.passDisagreementRate).toBe(0);
  expect(report.referencePassDisagreementRate).toBe(1);
  expect(report.humanPassDisagreementRate).toBeNull();
  expect(report.precision).toBeNull();
  expect(report.gatePassed).toBe(false);
  expect(summarizeTargetStudy([sample], [runs[0], runs[0], runs[2]]).complete).toBe(false);
  const input = { ...sample, task: weekendTask };
  expect(targetStudyCaseSchema.safeParse(input).success).toBe(true);
  expect(
    targetStudyCaseSchema.safeParse({ ...input, task: { ...weekendTask, targetLevel: 'B1' } })
      .success,
  ).toBe(false);
  expect(
    targetStudyCaseSchema.safeParse({
      ...input,
      targets: [
        { tag: 'verb-tense', uses: 0, expected: [{ original: 'goed', suggestions: ['went'] }] },
      ],
    }).success,
  ).toBe(false);
});

it('does not count an unused target as passing in either the reference or the grader', () => {
  for (const [referenceUses, reportedUses] of [
    [0, 4],
    [4, 0],
  ]) {
    const sample: TargetStudyCase = {
      id: 'unused',
      text: 'I live here.',
      level: 'A2',
      annotation: 'synthetic',
      annotator: 'fixture',
      expectedTaskScore: 3,
      targets: [{ tag: 'verb-tense', uses: referenceUses, expected: [] }],
    };
    const feedback = FeedbackSchema.parse({
      ...feedbackFixture,
      corrections: [],
      target_report: [{ tag: 'verb-tense', uses: reportedUses, errors: 0, correction_indexes: [] }],
    });
    const report = summarizeTargetStudy(
      [sample],
      [1, 2, 3].map((run) => ({ id: sample.id, run, graderVersion: 'fixture', feedback })),
    );
    expect(report.referencePassDisagreementRate).toBe(1);
  }
});

it('requires the full coverage and independent-review metadata before marking a study eligible', () => {
  // All data here is synthetic, including reviewer labels. This tests gate logic only.
  const tags = ['connectors', 'verb-tense', 'prepositions', 'modal-verbs', 'punctuation'] as const;
  const levels = ['A1', 'A2', 'B1'] as const;
  const cases: TargetStudyCase[] = Array.from({ length: 40 }, (_, index) => ({
    id: `fixture-${index}`,
    text: 'I goed home.',
    level: levels[index % 3],
    annotation: 'human',
    annotator: 'fixture-primary',
    secondCheckedBy: index < 10 ? 'fixture-secondary' : undefined,
    expectedTaskScore: 3,
    targets: [
      { tag: tags[index % 5], uses: 4, expected: [{ original: 'goed', suggestions: ['went'] }] },
    ],
  }));
  const runs = cases.flatMap((sample) =>
    [1, 2, 3].map((run) => ({
      id: sample.id,
      run,
      graderVersion: 'fixture-only',
      feedback: FeedbackSchema.parse({
        ...feedbackFixture,
        corrections: [{ ...feedbackFixture.corrections[0], tag: sample.targets[0].tag }],
        target_report: [
          { tag: sample.targets[0].tag, uses: 4, errors: 1, correction_indexes: [0] },
        ],
      }),
    })),
  );
  expect(summarizeTargetStudy(cases, runs)).toMatchObject({
    complete: true,
    gatePassed: true,
    noiseReady: true,
    secondChecked: 10,
  });
  expect(
    summarizeTargetStudy(
      cases.map((sample) => ({ ...sample, secondCheckedBy: sample.annotator })),
      runs,
    ).gatePassed,
  ).toBe(false);
  expect(
    summarizeTargetStudy(
      cases.map((sample) => ({ ...sample, annotation: 'synthetic' })),
      runs,
    ).gatePassed,
  ).toBe(false);
  expect(
    summarizeTargetStudy(
      cases,
      runs.map((run, index) => (index === 0 ? { ...run, feedback: null } : run)),
    ).gatePassed,
  ).toBe(false);
  const aiCases = cases.map((sample) => ({ ...sample, annotation: 'ai-reviewed' as const }));
  expect(summarizeTargetStudy(aiCases, runs)).toMatchObject({
    complete: true,
    precision: 1,
    passDisagreementRate: 0,
    referencePassDisagreementRate: 0,
    humanPassDisagreementRate: null,
    gatePassed: false,
    noiseReady: false,
  });
});

it('keeps provisional AI use estimates distinct from human-study annotations', () => {
  const sample = {
    id: 'ai-fixture',
    level: 'A2',
    annotation: 'ai-reviewed',
    annotator: 'assistant-ai',
    reviewStatus: 'provisional-not-human-gold',
    expectedTaskScore: 3,
    taskNote: 'Provisional.',
    text: 'I goed home.',
    task: weekendTask,
    targets: [
      {
        tag: 'verb-tense',
        usesEstimate: 4,
        expected: [{ original: 'goed', suggestions: ['went'] }],
        withheldCorrections: [],
        reviewNote: 'AI estimate.',
      },
    ],
  };
  expect(targetStudyCaseSchema.safeParse(sample).success).toBe(false);
  const parsed = aiTargetDiagnosticCaseSchema.parse(sample);
  expect(parsed.annotation).toBe('ai-reviewed');
  expect(parsed.targets[0].uses).toBe(4);
  expect(targetStudyCaseSchema.safeParse(parsed).success).toBe(false);
  expect(aiTargetDiagnosticCaseSchema.safeParse({ ...sample, annotation: 'human' }).success).toBe(
    false,
  );
  expect(
    aiTargetDiagnosticCaseSchema.safeParse({
      ...sample,
      targets: [{ ...sample.targets[0], usesEstimate: 0 }],
    }).success,
  ).toBe(false);
});
