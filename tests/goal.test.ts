import { expect, it } from 'vitest';
import type { CourseProgress } from '@/lib/course-progress';
import type { CurriculumLevel } from '@/lib/curriculum';
import { estimateFrom, summarizeGoal, type GoalAttempt, type GoalSummary } from '@/lib/goal';
import type { LearningProfile } from '@/lib/profile';

const now = new Date('2026-10-29T12:00:00Z');
const profile: LearningProfile = {
  nativeLanguage: 'vi',
  goal: 'general',
  startingLevel: 'A2',
  dailyMinutes: 15,
  targetLevel: 'B1',
  targetScore: null,
  targetDate: null,
};
const ielts: LearningProfile = { ...profile, goal: 'ielts', targetLevel: null, targetScore: 4 };

function course(current: CurriculumLevel | null, levels: CourseProgress['levels']): CourseProgress {
  return {
    track: 'core',
    lessonsDone: levels.reduce((sum, level) => sum + level.done, 0),
    lessonsTotal: levels.reduce((sum, level) => sum + level.total, 0),
    unitsDone: 0,
    unitsTotal: 0,
    doneThisWeek: 0,
    levels,
    current: current
      ? {
          lessonId: 'lesson',
          lessonTitle: 'Lesson',
          unitTitle: 'Unit',
          level: current,
          taskId: 'task',
          warmupsDone: false,
        }
      : null,
    recent: [],
  };
}
const coreCourse = course('A2', [
  { level: 'A1', done: 0, total: 9 },
  { level: 'A2', done: 4, total: 9 },
  { level: 'B1', done: 0, total: 9 },
  { level: 'B2', done: 0, total: 9 },
]);
const taskLevels = new Map<string, CurriculumLevel>([
  ['a2-task-1', 'A2'],
  ['a2-task-2', 'A2'],
  ['a2-task-3', 'A2'],
  ['b1-task-1', 'B1'],
  ['b1-task-2', 'B1'],
  ['b1-task-3', 'B1'],
]);

let day = 1;
function attempt(
  taskId: string,
  task: number,
  rest = task,
  overrides: Partial<GoalAttempt> = {},
): GoalAttempt {
  const at = `2026-10-${String(day++).padStart(2, '0')}T09:00:00Z`;
  return {
    at,
    taskId,
    attempt: 1,
    scores: { task, organization: rest, grammar: rest, vocabulary: rest },
    ...overrides,
  };
}
function summaryOf(
  attempts: GoalAttempt[],
  overrides: { profile?: LearningProfile; course?: CourseProgress } = {},
) {
  return summarizeGoal({
    profile: overrides.profile ?? profile,
    course: overrides.course ?? coreCourse,
    attempts,
    taskLevels,
    weeklyGoal: 5,
    weeklySessions: 2,
    now,
  });
}
function active(summary: GoalSummary) {
  if (summary.state !== 'active') throw new Error('Expected an active goal, got ' + summary.state);
  return summary;
}
function summarize(...args: Parameters<typeof summaryOf>) {
  return active(summaryOf(...args));
}

it('asks for a goal, then for a target, before summarizing anything', () => {
  expect(
    summarizeGoal({
      profile: null,
      course: coreCourse,
      attempts: [],
      taskLevels,
      weeklyGoal: 5,
      weeklySessions: 0,
    }),
  ).toEqual({ state: 'none' });
  expect(summaryOf([], { profile: { ...profile, targetLevel: null } })).toEqual({
    state: 'no-target',
    goal: 'general',
  });
});

it('withholds the estimate until three first attempts exist, ignoring revisions', () => {
  const revision = attempt('a2-task-3', 5, 5, { attempt: 2 });
  const summary = summarize([attempt('a2-task-1', 3), attempt('a2-task-2', 3), revision]);
  expect(summary).toMatchObject({
    state: 'active',
    status: 'collecting',
    estimate: null,
    evidence: { count: 2, needed: 1 },
  });
});

it('estimates from the latest five first attempts with a range and the clearly weakest skill', () => {
  const scored = (task: number, grammar: number) => ({
    ...attempt('a2-task-1', task),
    scores: { task, organization: 3, grammar, vocabulary: 3 },
  });
  const estimate = estimateFrom([
    attempt('a2-task-1', 1),
    scored(4, 2),
    scored(4, 2),
    scored(5, 2),
    scored(3, 2),
    scored(4, 3),
  ]);
  // The first (score 1) piece falls outside the five-piece window; pieces average 2.75 to 3.25.
  expect(estimate).toMatchObject({
    basedOn: 5,
    average: 3.1,
    low: 2.8,
    high: 3.3,
    weakest: 'grammar',
  });
  expect(estimate!.skills).toEqual({ task: 4, organization: 3, grammar: 2.2, vocabulary: 3 });
  // Grammar barely behind the other skills (less than 0.3) names no single weakness.
  const close = [
    scored(3, 3),
    scored(3, 3),
    { ...scored(3, 2), scores: { task: 3, organization: 3, grammar: 2.8, vocabulary: 3 } },
  ];
  expect(estimateFrom(close)!.weakest).toBeNull();
});

it('measures a level goal at the current level until the learner reaches the target level', () => {
  const below = summarize([
    attempt('a2-task-1', 4),
    attempt('a2-task-2', 4),
    attempt('a2-task-3', 4),
  ]);
  expect(below).toMatchObject({
    scope: { kind: 'level', level: 'A2' },
    levelsToGo: 1,
    // Five A2 lessons left plus all nine B1 lessons; A1 is below the start and B2 above the target.
    lessonsRemaining: 14,
    status: 'working',
    estimate: { average: 4 },
  });
  // B1 pieces do not count while the learner still works at A2.
  expect(summarize([attempt('b1-task-1', 5), attempt('b1-task-2', 5)]).evidence.count).toBe(0);
});

it('reaches a level goal only when target-level lessons are done and first attempts meet the level', () => {
  const atTarget = course('B1', [{ level: 'B1', done: 8, total: 9 }]);
  const strong = [attempt('b1-task-1', 3), attempt('b1-task-2', 3), attempt('b1-task-3', 4)];
  expect(summarize(strong, { course: atTarget })).toMatchObject({
    scope: { level: 'B1' },
    status: 'close',
  });
  const finished = course(null, [{ level: 'B1', done: 9, total: 9 }]);
  expect(summarize(strong, { course: finished })).toMatchObject({ status: 'reached' });
  const weak = [attempt('b1-task-1', 2), attempt('b1-task-2', 2), attempt('b1-task-3', 2)];
  expect(summarize(weak, { course: finished })).toMatchObject({ status: 'working' });
});

it('measures an IELTS goal on IELTS first attempts against the practice score', () => {
  const ieltsCourse = {
    ...course('B1', [{ level: 'B1', done: 3, total: 9 }]),
    track: 'ielts' as const,
  };
  const pieces = [
    attempt('ielts-charts-task', 3.5),
    attempt('ielts-letters-task', 3.5),
    attempt('ielts-maps-task', 4),
    attempt('a2-task-1', 1),
  ];
  expect(summarize(pieces, { profile: ielts, course: ieltsCourse })).toMatchObject({
    track: 'ielts',
    scope: { kind: 'ielts' },
    lessonsRemaining: 6,
    evidence: { count: 3, needed: 0 },
    estimate: { average: 3.7 },
    status: 'close',
  });
  expect(
    summarize(pieces, { profile: { ...ielts, targetScore: 3.5 }, course: ieltsCourse }).status,
  ).toBe('reached');
  expect(
    summarize(pieces, { profile: { ...ielts, targetScore: 5 }, course: ieltsCourse }).status,
  ).toBe('working');
});

it('reports the weekly pace a target date needs, and says when the date has passed', () => {
  const dated = (targetDate: string) => summarize([], { profile: { ...profile, targetDate } }).pace;
  // 14 lessons over 10 weeks is 2 a week, within the weekly goal of 5.
  expect(dated('2027-01-07')).toEqual({ weeksLeft: 10, perWeekNeeded: 2, status: 'on-pace' });
  // 14 lessons in 2 weeks needs 7 a week.
  expect(dated('2026-11-12')).toEqual({ weeksLeft: 2, perWeekNeeded: 7, status: 'behind' });
  expect(dated('2026-10-01')).toMatchObject({ status: 'date-passed' });
  expect(summarize([]).pace).toBeNull();
});
