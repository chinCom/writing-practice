import { expect, it } from 'vitest';
import draft from '../curriculum/growth.draft.json';
import { curriculumSchema } from '@/lib/curriculum';
import {
  benchmarkContextForTask,
  summarizeBenchmarks,
  writingIndicators,
  type BenchmarkCheck,
} from '@/lib/benchmarks';

const first: BenchmarkCheck = {
  id: 'first',
  at: '2026-10-01',
  attempt: 1,
  safety: false,
  version: 'pinned:v1',
  context: { unitId: 'unit', contentHash: 'reviewed', role: 'baseline', minWords: 5, maxWords: 20 },
  text: 'One cat sleeps. Two dogs play.',
  scores: { task: 2, grammar: 2, organization: 2, vocabulary: 2 },
  targets: [{ tag: 'articles', uses: 10, errors: 2, correction_indexes: [] }],
};
const last: BenchmarkCheck = {
  ...first,
  id: 'last',
  at: '2026-10-15',
  context: { ...first.context!, role: 'checkpoint' },
  scores: { task: 4, grammar: 4, organization: 4, vocabulary: 4 },
  targets: [{ tag: 'articles', uses: 10, errors: 0, correction_indexes: [] }],
};
it('recognizes only reviewed unit baseline and parallel checkpoint tasks', () => {
  const unit = curriculumSchema.parse(draft)[0];
  expect(benchmarkContextForTask(unit, 'exact-hash', unit.lessons[0].task.id)).toMatchObject({
    role: 'baseline',
    contentHash: 'exact-hash',
  });
  expect(benchmarkContextForTask(unit, 'exact-hash', unit.parallelPrompt!.id)).toMatchObject({
    role: 'checkpoint',
  });
  expect(
    benchmarkContextForTask(
      { ...unit, parallelPrompt: undefined },
      'hash',
      unit.lessons[0].task.id,
    ),
  ).toBeNull();
  expect(benchmarkContextForTask(unit, 'hash', 'weekend')).toBeNull();
});
it('compares only safe first attempts on matched reviewed content and grader versions', () => {
  expect(summarizeBenchmarks([first, last])).toMatchObject([
    {
      unitId: 'unit',
      version: 'pinned:v1',
      scoreDelta: 2,
      scoreChange: 'uncalibrated',
      targets: [{ tag: 'articles', before: 0.2, after: 0, change: 'uncalibrated' }],
    },
  ]);
  for (const invalid of [
    { ...last, attempt: 2 },
    { ...last, safety: true },
    { ...last, version: 'other' },
    { ...last, context: { ...last.context!, contentHash: 'edited' } },
    { ...last, context: null },
    { ...last, at: '2026-09-01' },
  ])
    expect(summarizeBenchmarks([first, invalid])).toEqual([]);
  expect(
    summarizeBenchmarks([
      first,
      { ...last, targets: [{ tag: 'articles', uses: 0, errors: 0, correction_indexes: [] }] },
    ])[0].targets[0].after,
  ).toBeNull();
});
it('requires verified same-version human calibration and a difference strictly above twice noise', () => {
  const noise = {
    version: 'pinned:v1',
    humanReviewed: true as const,
    precisionPassed: true as const,
    texts: 30,
    runsPerText: 3 as const,
    scoreSd: 1,
    targetSd: { articles: 0.05 },
  };
  expect(summarizeBenchmarks([first, last], noise)[0]).toMatchObject({
    scoreChange: 'about-same',
    targets: [{ change: 'lower' }],
  });
  expect(summarizeBenchmarks([first, last], { ...noise, scoreSd: 0.9 })[0].scoreChange).toBe(
    'higher',
  );
  expect(summarizeBenchmarks([first, last], { ...noise, texts: 29 })[0].scoreChange).toBe(
    'uncalibrated',
  );
  expect(summarizeBenchmarks([first, last], { ...noise, version: 'other' })[0].scoreChange).toBe(
    'uncalibrated',
  );
});
it('reports deterministic context without scoring short or empty lexical samples', () => {
  expect(writingIndicators('One cat sleeps. Two dogs play.', 5, 20)).toEqual({
    words: 6,
    inRange: true,
    meanSentenceLength: 3,
    mtld: null,
  });
  expect(writingIndicators('', 5, 20)).toEqual({
    words: 0,
    inRange: false,
    meanSentenceLength: null,
    mtld: null,
  });
  expect(writingIndicators(Array(60).fill('cat').join(' '), 5, 20)).toMatchObject({
    words: 60,
    inRange: false,
    meanSentenceLength: 60,
  });
  expect(writingIndicators(Array(60).fill('cat').join(' '), 5, 100).mtld).toBe(2);
});
