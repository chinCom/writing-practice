import type { CurriculumLevel, CurriculumTrack, CurriculumUnit } from '@/lib/curriculum';
import type { CoursePathUnit } from '@/lib/curriculum-path';
import type { AdvisoryTarget } from '@/lib/mastery';

export type NextTask =
  | {
      kind: 'lesson';
      level: CurriculumLevel;
      unitTitle: string;
      lessonTitle: string;
      prompt: string;
      minWords: number;
      maxWords: number;
      focus: CurriculumUnit['grammarFocus'];
      advisoryTargets: AdvisoryTarget[];
      href: string;
      warmupsDone: boolean;
    }
  | { kind: 'placement'; href: '/placement' }
  | { kind: 'weekend'; href: '/write/weekend' };

const weekend = { kind: 'weekend', href: '/write/weekend' } as const;

// Today follows the learner's goal track. Without seeded lessons, or after the last lesson, keep the weekend task.
export function nextTask(
  path?: {
    chosenLevel: CurriculumLevel | null;
    units: CoursePathUnit[];
  },
  track: CurriculumTrack = 'core',
): NextTask {
  if (!path?.units.length) return weekend;
  // IELTS modules are open from the start; only the Core path needs a starting level.
  if (track === 'core' && !path.chosenLevel) return { kind: 'placement', href: '/placement' };
  for (const unit of path.units) {
    const lesson = unit.lessons.find((item) => item.state === 'current');
    if (!lesson) continue;
    return {
      kind: 'lesson',
      level: unit.level,
      unitTitle: unit.title,
      lessonTitle: lesson.title,
      prompt: lesson.task.prompt,
      minWords: lesson.task.minWords,
      maxWords: lesson.task.maxWords,
      focus: unit.grammarFocus,
      advisoryTargets: lesson.advisoryTargets,
      href: lesson.warmupsDone ? '/write/' + lesson.task.id : '/lesson/' + lesson.id,
      warmupsDone: lesson.warmupsDone,
    };
  }
  return weekend;
}
