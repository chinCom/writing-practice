import {
  curriculumLevel,
  publicLesson,
  passesCheckpoint,
  type CurriculumUnit,
  type CurriculumLevel,
  type CurriculumTrack,
  getTrackUnits,
} from './curriculum';
export function buildCoursePath(
  content: CurriculumUnit[],
  chosenLevel: CurriculumLevel | null,
  progress: { lessonId: string; warmups: Record<string, boolean> }[],
  checks: {
    taskId: string;
    feedback: {
      safety_flag: boolean;
      scores: { task: number; organization: number; grammar: number; vocabulary: number };
    };
  }[],
  track: CurriculumTrack = 'core',
) {
  const ranks = Object.fromEntries(curriculumLevel.options.map((level, index) => [level, index]));
  let open = Boolean(chosenLevel);
  return getTrackUnits(content, track)
    .sort((a, b) => ranks[a.level] - ranks[b.level] || a.order - b.order)
    .map((unit) => {
      if (track === 'ielts') open = true;
      const beforeStart =
        track === 'core' && chosenLevel !== null && ranks[unit.level] < ranks[chosenLevel];
      const lessons = unit.lessons.map((lesson) => {
        const saved = progress.find((item) => item.lessonId === lesson.id);
        const warmupsDone = lesson.warmups.every(
          (_, index) => saved?.warmups[String(index)] === true,
        );
        const writingDone = checks.some(
          (check) =>
            check.taskId === lesson.task.id &&
            !check.feedback.safety_flag &&
            (!lesson.task.isCheckpoint || passesCheckpoint(check.feedback.scores, false)),
        );
        const done = warmupsDone && writingDone;
        const state = beforeStart ? 'available' : done ? 'done' : open ? 'current' : 'locked';
        if (!beforeStart && !done) open = false;
        return {
          ...publicLesson(lesson),
          state,
          warmupsDone,
          writingDone,
          answers: saved?.warmups ?? {},
        };
      });
      return { ...unit, lessons };
    });
}
