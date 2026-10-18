import {
  curriculumLevel,
  publicLesson,
  type CurriculumUnit,
  type CurriculumLevel,
  type CurriculumTrack,
  getTrackUnits,
} from './curriculum';
import { advisoryTargets, type MasteryAssessment } from './mastery';
import { growthTargetsEnabled, targetsForUnit } from './targets';
import {
  lessonCompletion,
  type LessonProgressRecord,
  type LessonCheckRecord,
} from './lesson-completion';
export function buildCoursePath(
  content: CurriculumUnit[],
  chosenLevel: CurriculumLevel | null,
  progress: LessonProgressRecord[],
  checks: LessonCheckRecord[],
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
        const { warmupsDone, writingDone, done, completedAt, latest, answers } = lessonCompletion(
          lesson,
          progress,
          checks,
        );
        const state = done ? 'done' : beforeStart ? 'available' : open ? 'current' : 'locked';
        if (!beforeStart && !done) open = false;
        const recommendedTargets =
          track === 'core' ? advisoryTargets(targetsForUnit(unit), carried) : [];
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
          answers,
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
