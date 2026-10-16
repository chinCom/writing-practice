import { summarizeBenchmarks } from '@/lib/benchmarks';
import { summarizeProgress } from '@/lib/progress';
import { summarizeImprovement, type CheckEvent } from '@/lib/improvement';
import { summarizeCourse } from '@/lib/course-progress';
import { summarizeTargets, type TargetEvent } from '@/lib/target-progress';
import coreDraft from '../../curriculum/course.draft.json';
import { curriculumSchema } from '@/lib/curriculum';
import { buildCoursePath } from '@/lib/curriculum-path';
import type { ProgressPageData } from '@/lib/db/progress';

const now = new Date('2026-10-15T12:00:00Z');
// Day, task, organization, grammar, vocabulary, counted errors.
const rows: [string, number, number, number, number, number][] = [
  ['2026-09-22', 2, 2, 1, 2, 6],
  ['2026-09-24', 2, 3, 2, 2, 5],
  ['2026-09-29', 3, 2, 2, 3, 5],
  ['2026-10-02', 3, 3, 2, 3, 4],
  ['2026-10-06', 3, 3, 3, 3, 3],
  ['2026-10-09', 4, 3, 3, 3, 3],
  ['2026-10-13', 4, 4, 3, 4, 2],
  ['2026-10-14', 4, 4, 4, 4, 1],
];
const checks: CheckEvent[] = rows.map(
  ([day, task, organization, grammar, vocabulary, errors], index) => ({
    id: 'sample-' + index,
    at: day + 'T10:00:00Z',
    attempt: 1,
    parentId: null,
    words: 80,
    scores: { task, organization, grammar, vocabulary },
    corrections: Array.from({ length: errors }, () => ({
      confidence: 0.9,
      severity: 'major' as const,
    })),
  }),
);
checks.push({
  ...checks[7],
  id: 'sample-revision',
  at: '2026-10-14T11:00:00Z',
  attempt: 2,
  parentId: 'sample-7',
  scores: { task: 5, organization: 4, grammar: 5, vocabulary: 4 },
});

const summary = summarizeProgress(
  [
    { at: '2026-10-12T10:00:00Z', words: 50, level: 'A2', corrections: [] },
    { at: '2026-10-13T10:00:00Z', words: 50, level: 'A2', corrections: [] },
    {
      at: '2026-10-14T10:00:00Z',
      words: 50,
      level: 'A2',
      corrections: [{ tag: 'verb-tense', confidence: 0.9, severity: 'major' }],
    },
    { at: '2026-10-14T11:00:00Z', words: 25, level: 'A2', corrections: [] },
  ],
  [],
  new Date('2026-10-15T12:00:00Z'),
);

export const progressSample: ProgressPageData = {
  ...summary,
  improvement: summarizeImprovement(checks, now),
  benchmarks: summarizeBenchmarks(
    [2, 4].map((value, index) => ({
      id: 'benchmark-' + index,
      at: index ? '2026-10-15' : '2026-10-01',
      attempt: 1,
      safety: false,
      version: 'synthetic:preview',
      context: {
        unitId: 'a2-messages',
        contentHash: 'preview',
        role: index ? ('checkpoint' as const) : ('baseline' as const),
        minWords: 5,
        maxWords: 20,
      },
      text: 'One cat sleeps. Two dogs play.',
      scores: { task: value, grammar: value, organization: value, vocabulary: value },
      targets: [
        { tag: 'articles' as const, uses: 10, errors: index ? 0 : 2, correction_indexes: [] },
      ],
    })),
  ),
  targets: summarizeTargets(
    (
      [
        { tag: 'verb-tense', at: '2026-10-01T12:00:00Z', errors: 3 },
        { tag: 'verb-tense', at: '2026-10-12T12:00:00Z', errors: 1 },
        { tag: 'verb-tense', at: '2026-10-13T12:00:00Z', errors: 1 },
        { tag: 'articles', at: '2026-10-12T12:00:00Z', errors: 0 },
        { tag: 'articles', at: '2026-10-15T12:00:00Z', errors: 0 },
        { tag: 'prepositions', at: '2026-10-14T12:00:00Z', uses: 0 },
      ] as const
    ).map((row, index): TargetEvent => ({
      submissionId: 'target-' + index,
      taskId: 'task-' + index,
      level: 'A2',
      uses: 10,
      errors: 0,
      isFirstAttempt: true,
      graderVersion: 'synthetic:preview',
      ...row,
    })),
    now,
  ),
  course: {
    core: summarizeCourse(
      buildCoursePath(curriculumSchema.parse(coreDraft), 'A1', [], [], 'core'),
      'core',
      now,
    ),
    ielts: summarizeCourse([], 'ielts', now),
  },
};
export const progressEmptySample: ProgressPageData = {
  ...progressSample,
  improvement: summarizeImprovement([], now),
  targets: [],
  benchmarks: [],
};
