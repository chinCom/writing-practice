import {
  curriculumLevel,
  publicLesson,
  passesCheckpoint,
  type CurriculumUnit,
  type CurriculumLevel,
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
) {
  const ranks = Object.fromEntries(curriculumLevel.options.map((level, index) => [level, index]));
  let open = Boolean(chosenLevel);
  return [...content]
    .sort((a, b) => ranks[a.level] - ranks[b.level] || a.order - b.order)
    .map((unit) => {
      const beforeStart = chosenLevel !== null && ranks[unit.level] < ranks[chosenLevel];
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
