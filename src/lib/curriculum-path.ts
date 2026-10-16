import {
  curriculumLevel,
  publicLesson,
  passesCheckpoint,
  type CurriculumUnit,
  type CurriculumLevel,
  type CurriculumTrack,
  getTrackUnits,
} from './curriculum';
import { advisoryTargets, type MasteryAssessment } from './mastery';
import { growthTargetsEnabled, targetsForUnit } from './targets';
export function buildCoursePath(
  content: CurriculumUnit[],
  chosenLevel: CurriculumLevel | null,
  progress: { lessonId: string; warmups: Record<string, boolean>; completedAt?: Date | null }[],
  checks: {
    taskId: string;
    at?: Date;
    masteryAdvisory?: MasteryAssessment | null;
    feedback: {
      safety_flag: boolean;
      scores: { task: number; organization: number; grammar: number; vocabulary: number };
    };
  }[],
  track: CurriculumTrack = 'core',
) {
  const ranks = Object.fromEntries(curriculumLevel.options.map((level, index) => [level, index]));
  let open = Boolean(chosenLevel);
  let carried: MasteryAssessment['carried'] = [];
  let carriedLevel: CurriculumLevel | null = null;
  return getTrackUnits(content, track)
    .sort((a, b) => ranks[a.level] - ranks[b.level] || a.order - b.order)
    .map((unit) => {
      if (track === 'ielts') open = true;
      if (carriedLevel !== unit.level) {
        carried = [];
        carriedLevel = unit.level;
      }
      const beforeStart =
        track === 'core' && chosenLevel !== null && ranks[unit.level] < ranks[chosenLevel];
      const lessons = unit.lessons.map((storedLesson) => {
        const lesson =
          unit.parallelPrompt?.id === storedLesson.task.id
            ? { ...storedLesson, task: unit.parallelPrompt }
            : storedLesson;
        const saved = progress.find((item) => item.lessonId === lesson.id);
        const warmupsDone = lesson.warmups.every(
          (_, index) => saved?.warmups[String(index)] === true,
        );
        const passingChecks = checks.filter(
          (check) =>
            check.taskId === lesson.task.id &&
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
        const state = done ? 'done' : beforeStart ? 'available' : open ? 'current' : 'locked';
        if (!beforeStart && !done) open = false;
        const recommendedTargets =
          track === 'core' ? advisoryTargets(targetsForUnit(unit), carried) : [];
        const latest = checks
          .filter((check) => check.taskId === lesson.task.id)
          .sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0))[0];
        if (
          track === 'core' &&
          growthTargetsEnabled() &&
          done &&
          !latest?.feedback.safety_flag &&
          latest?.masteryAdvisory?.outcome === 'carry-forward'
        )
          carried = [...new Set([...carried, ...latest.masteryAdvisory.carried])].slice(0, 2);
        return {
          advisoryTargets: recommendedTargets,
          ...publicLesson(lesson),
          state,
          warmupsDone,
          completedAt,
          writingDone,
          answers: saved?.warmups ?? {},
        };
      });
      // Authored exercise answer keys are server-only, like warm-up answers.
      const publicUnit = { ...unit };
      delete publicUnit.transferDrills;
      delete publicUnit.parallelPrompt;
      return { ...publicUnit, lessons };
    });
}

export type CoursePathUnit = ReturnType<typeof buildCoursePath>[number];
