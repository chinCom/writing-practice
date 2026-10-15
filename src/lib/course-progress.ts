import type { CurriculumLevel, CurriculumTrack } from '@/lib/curriculum';
import type { CoursePathUnit } from '@/lib/curriculum-path';
import { weekStartUtc } from '@/lib/improvement';

export type CourseProgress = {
  track: CurriculumTrack;
  lessonsDone: number;
  lessonsTotal: number;
  unitsDone: number;
  unitsTotal: number;
  doneThisWeek: number;
  levels: { level: CurriculumLevel; done: number; total: number }[];
  current: {
    lessonId: string;
    lessonTitle: string;
    unitTitle: string;
    level: CurriculumLevel;
    taskId: string;
    warmupsDone: boolean;
  } | null;
  recent: { lessonId: string; title: string; completedAt: string }[];
};

const recentCount = 5;

export function summarizeCourse(
  units: CoursePathUnit[],
  track: CurriculumTrack,
  now = new Date(),
): CourseProgress {
  const lessons = units.flatMap((unit) => unit.lessons.map((lesson) => ({ unit, lesson })));
  const done = lessons.filter(({ lesson }) => lesson.state === 'done');
  const thisWeek = weekStartUtc(now.toISOString());
  const levels = new Map<CurriculumLevel, { done: number; total: number }>();
  for (const { unit, lesson } of lessons) {
    const level = levels.get(unit.level) ?? { done: 0, total: 0 };
    level.total++;
    if (lesson.state === 'done') level.done++;
    levels.set(unit.level, level);
  }
  const current = lessons.find(({ lesson }) => lesson.state === 'current');
  return {
    track,
    lessonsDone: done.length,
    lessonsTotal: lessons.length,
    unitsDone: units.filter((unit) => unit.lessons.every((lesson) => lesson.state === 'done'))
      .length,
    unitsTotal: units.length,
    doneThisWeek: done.filter(
      ({ lesson }) => lesson.completedAt && weekStartUtc(lesson.completedAt) === thisWeek,
    ).length,
    levels: [...levels].map(([level, counts]) => ({ level, ...counts })),
    current: current
      ? {
          lessonId: current.lesson.id,
          lessonTitle: current.lesson.title,
          unitTitle: current.unit.title,
          level: current.unit.level,
          taskId: current.lesson.task.id,
          warmupsDone: current.lesson.warmupsDone,
        }
      : null,
    recent: done
      .flatMap(({ lesson }) =>
        lesson.completedAt
          ? [{ lessonId: lesson.id, title: lesson.title, completedAt: lesson.completedAt }]
          : [],
      )
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .slice(0, recentCount),
  };
}
