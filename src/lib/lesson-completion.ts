import { passesCheckpoint, type Lesson } from './curriculum';
import type { MasteryAssessment } from './mastery';

export type LessonProgressRecord = {
  lessonId: string;
  warmups: Record<string, boolean>;
  completedAt?: Date | null;
};
export type LessonCheckRecord = {
  taskId: string;
  at?: Date;
  masteryAdvisory?: MasteryAssessment | null;
  feedback: {
    safety_flag: boolean;
    scores: { task: number; organization: number; grammar: number; vocabulary: number };
  };
};

// Completion evidence is independent of path order, starting level and unlock policy.
export function lessonCompletion(
  lesson: Lesson,
  progress: LessonProgressRecord[],
  checks: LessonCheckRecord[],
) {
  const saved = progress.find((item) => item.lessonId === lesson.id);
  const warmupsDone = lesson.warmups.every((_, index) => saved?.warmups[String(index)] === true);
  const matchingChecks = checks.filter((check) => check.taskId === lesson.task.id);
  const passingChecks = matchingChecks.filter(
    (check) =>
      !check.feedback.safety_flag &&
      (!lesson.task.isCheckpoint || passesCheckpoint(check.feedback.scores, false)),
  );
  const writingDone = passingChecks.length > 0;
  const done = warmupsDone && writingDone;
  const firstPass = passingChecks
    .flatMap((check) => (check.at ? [check.at.getTime()] : []))
    .sort((a, b) => a - b)[0];
  const warmupsAt = saved?.completedAt?.getTime();
  // A lesson is complete when its last requirement is met.
  const finishedAt = Math.max(warmupsAt ?? 0, firstPass ?? 0);
  const completedAt = done && finishedAt ? new Date(finishedAt).toISOString() : null;
  const latest = matchingChecks.sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0))[0];
  return { warmupsDone, writingDone, done, completedAt, latest, answers: saved?.warmups ?? {} };
}
