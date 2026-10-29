import type { CurriculumLevel, CurriculumTrack } from '@/lib/curriculum';
import { summarizeCourse, type CourseProgress } from '@/lib/course-progress';
import type { CoursePathUnit } from '@/lib/curriculum-path';
import type { Feedback } from '@/lib/feedback/schema';
import { averageScore, isFirstAttempt, scoreKeys, type ScoreKey } from '@/lib/improvement';
import { goalTrack, hasTarget, type LearningGoal, type LearningProfile } from '@/lib/profile';

export type GoalAttempt = {
  at: string;
  taskId: string;
  attempt: number;
  scores: Feedback['scores'];
};
export type GoalTarget =
  { kind: 'level'; level: CurriculumLevel } | { kind: 'ielts'; score: number };
export type GoalEstimate = {
  average: number;
  low: number;
  high: number;
  skills: Record<ScoreKey, number>;
  /** The skill holding the learner back, only when it clearly trails the others. */
  weakest: ScoreKey | null;
  basedOn: number;
};
export type GoalPace = {
  weeksLeft: number;
  perWeekNeeded: number;
  status: 'on-pace' | 'behind' | 'date-passed';
};
export type GoalSummary =
  | { state: 'none' }
  | { state: 'no-target'; goal: LearningGoal }
  | {
      state: 'active';
      goal: LearningGoal;
      track: CurriculumTrack;
      target: GoalTarget;
      targetDate: string | null;
      /** IELTS work, or the level whose tasks the estimate is measured on. */
      scope: { kind: 'ielts' } | { kind: 'level'; level: CurriculumLevel };
      levelsToGo: number;
      lessonsRemaining: number;
      evidence: { count: number; needed: number };
      estimate: GoalEstimate | null;
      status: 'collecting' | 'working' | 'close' | 'reached';
      pace: GoalPace | null;
      week: { done: number; planned: number };
    };

const levels = ['PRE_A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
const rank = (level: CurriculumLevel) => levels.indexOf(level);
// Three pieces before any estimate, so one good or bad day cannot set it.
const evidenceNeeded = 3;
const evidenceWindow = 5;
// On the grader's 0–5 scale, 3 means the writing meets the task's level.
const meetsLevel = 3;
const closeMargin = 0.5;
const clearGap = 0.3;
const dayMilliseconds = 86400000;
const roundOne = (value: number) => Math.round(value * 10) / 10;

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function weakestSkill(skills: Record<ScoreKey, number>): ScoreKey | null {
  const [lowest, next] = [...scoreKeys].sort((a, b) => skills[a] - skills[b]);
  return skills[next] - skills[lowest] >= clearGap ? lowest : null;
}

export function estimateFrom(attempts: GoalAttempt[]): GoalEstimate | null {
  if (attempts.length < evidenceNeeded) return null;
  const recent = [...attempts].sort((a, b) => a.at.localeCompare(b.at)).slice(-evidenceWindow);
  const averages = recent.map((attempt) => averageScore(attempt.scores));
  const skills = Object.fromEntries(
    scoreKeys.map((key) => [key, roundOne(mean(recent.map((attempt) => attempt.scores[key])))]),
  ) as Record<ScoreKey, number>;
  return {
    average: roundOne(mean(averages)),
    low: roundOne(Math.min(...averages)),
    high: roundOne(Math.max(...averages)),
    skills,
    weakest: weakestSkill(skills),
    basedOn: recent.length,
  };
}

function targetOf(profile: LearningProfile): GoalTarget {
  return profile.goal === 'ielts'
    ? { kind: 'ielts', score: profile.targetScore! }
    : { kind: 'level', level: profile.targetLevel! };
}

/** The level whose tasks show progress now: the current level until the learner reaches the target. */
function workingLevel(course: CourseProgress, target: CurriculumLevel) {
  const current = course.current?.level;
  return current && rank(current) < rank(target) ? current : target;
}

function lessonsBetween(course: CourseProgress, from: CurriculumLevel, to: CurriculumLevel) {
  return course.levels
    .filter(({ level }) => rank(level) >= rank(from) && rank(level) <= rank(to))
    .reduce((sum, { done, total }) => sum + total - done, 0);
}

function paceFor(
  targetDate: string | null,
  lessonsRemaining: number,
  weeklyGoal: number,
  now: Date,
): GoalPace | null {
  if (!targetDate) return null;
  const today = Date.parse(now.toISOString().slice(0, 10));
  const daysLeft = (Date.parse(targetDate) - today) / dayMilliseconds;
  if (daysLeft < 0) return { weeksLeft: 0, perWeekNeeded: lessonsRemaining, status: 'date-passed' };
  const weeksLeft = Math.max(1, Math.ceil(daysLeft / 7));
  const perWeekNeeded = Math.ceil(lessonsRemaining / weeksLeft);
  return { weeksLeft, perWeekNeeded, status: perWeekNeeded <= weeklyGoal ? 'on-pace' : 'behind' };
}

function ieltsStatus(estimate: GoalEstimate | null, score: number) {
  if (!estimate) return 'collecting';
  if (estimate.average >= score) return 'reached';
  return score - estimate.average <= closeMargin ? 'close' : 'working';
}

function levelStatus(estimate: GoalEstimate | null, atTarget: boolean, targetLessonsDone: boolean) {
  if (!estimate) return 'collecting';
  if (!atTarget) return 'working';
  if (estimate.average >= meetsLevel && targetLessonsDone) return 'reached';
  return meetsLevel - estimate.average <= closeMargin ? 'close' : 'working';
}

export function summarizeGoal({
  profile,
  course,
  attempts,
  taskLevels,
  weeklyGoal,
  weeklySessions,
  now = new Date(),
}: {
  profile: LearningProfile | null;
  /** Course progress on the goal's track. */
  course: CourseProgress;
  attempts: GoalAttempt[];
  /** Curriculum task id to its unit level, across both tracks. */
  taskLevels: Map<string, CurriculumLevel>;
  weeklyGoal: number;
  weeklySessions: number;
  now?: Date;
}): GoalSummary {
  if (!profile) return { state: 'none' };
  if (!hasTarget(profile)) return { state: 'no-target', goal: profile.goal };
  const target = targetOf(profile);
  const firstAttempts = attempts.filter(
    (attempt) => isFirstAttempt(attempt) && new Date(attempt.at) <= now,
  );
  const week = { done: weeklySessions, planned: weeklyGoal };
  if (target.kind === 'ielts') {
    const evidence = firstAttempts.filter((attempt) => attempt.taskId.startsWith('ielts-'));
    const estimate = estimateFrom(evidence);
    const lessonsRemaining = course.lessonsTotal - course.lessonsDone;
    return {
      state: 'active',
      goal: profile.goal,
      track: goalTrack(profile.goal),
      target,
      targetDate: profile.targetDate,
      scope: { kind: 'ielts' },
      levelsToGo: 0,
      lessonsRemaining,
      evidence: { count: evidence.length, needed: Math.max(0, evidenceNeeded - evidence.length) },
      estimate,
      status: ieltsStatus(estimate, target.score),
      pace: paceFor(profile.targetDate, lessonsRemaining, weeklyGoal, now),
      week,
    };
  }
  const level = workingLevel(course, target.level);
  const evidence = firstAttempts.filter((attempt) => taskLevels.get(attempt.taskId) === level);
  const estimate = estimateFrom(evidence);
  const targetLessons = course.levels.find((entry) => entry.level === target.level);
  const lessonsRemaining = lessonsBetween(course, level, target.level);
  return {
    state: 'active',
    goal: profile.goal,
    track: goalTrack(profile.goal),
    target,
    targetDate: profile.targetDate,
    scope: { kind: 'level', level },
    levelsToGo: rank(target.level) - rank(level),
    lessonsRemaining,
    evidence: { count: evidence.length, needed: Math.max(0, evidenceNeeded - evidence.length) },
    estimate,
    status: levelStatus(
      estimate,
      level === target.level,
      Boolean(targetLessons?.total) && targetLessons!.done === targetLessons!.total,
    ),
    pace: paceFor(profile.targetDate, lessonsRemaining, weeklyGoal, now),
    week,
  };
}

/** Builds the goal summary from both track paths, so Today and Progress share one rule. */
export function goalFromPaths({
  profile,
  paths,
  attempts,
  weeklyGoal,
  weeklySessions,
  now = new Date(),
}: {
  profile: LearningProfile | null;
  paths: Record<CurriculumTrack, { units: CoursePathUnit[] }>;
  attempts: GoalAttempt[];
  weeklyGoal: number;
  weeklySessions: number;
  now?: Date;
}): GoalSummary {
  const track = profile ? goalTrack(profile.goal) : 'core';
  const taskLevels = new Map(
    [...paths.core.units, ...paths.ielts.units].flatMap((unit) =>
      unit.lessons.map((lesson) => [lesson.task.id, unit.level] as const),
    ),
  );
  return summarizeGoal({
    profile,
    course: summarizeCourse(paths[track].units, track, now),
    attempts,
    taskLevels,
    weeklyGoal,
    weeklySessions,
    now,
  });
}
