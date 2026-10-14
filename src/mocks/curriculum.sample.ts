import { curriculumDraft } from '@/mocks/curriculum-content';
import type { LearningPath } from '@/lib/db/curriculum';
export const pathSample: LearningPath = {
  chosenLevel: 'A1',
  placement: {
    cefr: 'A1',
    confidence: 0.75,
    reason: 'Synthetic preview only.',
    safety_flag: false,
  },
  units: curriculumDraft.map((unit, unitIndex) => ({
    ...unit,
    lessons: unit.lessons.map((lesson, index) => ({
      ...lesson,
      state: unitIndex === 0 && index === 0 ? 'current' : 'locked',
      warmupsDone: false,
      answers: {},
    })),
  })),
};
