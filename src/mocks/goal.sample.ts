import coreDraft from '../../curriculum/course.draft.json';
import ieltsDraft from '../../curriculum/ielts.draft.json';
import { curriculumSchema } from '@/lib/curriculum';
import { buildCoursePath } from '@/lib/curriculum-path';
import { goalFromPaths, type GoalAttempt, type GoalSummary } from '@/lib/goal';
import type { LearningProfile } from '@/lib/profile';
import { nextTask } from '@/lib/next-task';

// Previews run through the real goal rules, so a sample can never show a state the app cannot reach.
const now = new Date('2026-10-15T12:00:00Z');
const core = curriculumSchema.parse(coreDraft);
const ielts = curriculumSchema.parse(ieltsDraft);
const paths = {
  core: { units: buildCoursePath(core, 'A2', [], [], 'core') },
  ielts: { units: buildCoursePath(ielts, null, [], [], 'ielts') },
};
const a2Tasks = paths.core.units
  .filter((unit) => unit.level === 'A2')
  .flatMap((unit) => unit.lessons.map((lesson) => lesson.task.id));
const ieltsTasks = paths.ielts.units.flatMap((unit) =>
  unit.lessons.map((lesson) => lesson.task.id),
);

const general: LearningProfile = {
  nativeLanguage: 'vi',
  goal: 'general',
  startingLevel: 'A2',
  dailyMinutes: 15,
  targetLevel: 'B1',
  targetScore: null,
  targetDate: '2027-03-15',
};
const ieltsGoal: LearningProfile = {
  ...general,
  goal: 'ielts',
  targetLevel: null,
  targetScore: 4,
  targetDate: '2026-11-01',
};

// Task, organization, grammar, vocabulary for each first attempt, oldest first.
function attempts(tasks: string[], scores: [number, number, number, number][]): GoalAttempt[] {
  return scores.map(([task, organization, grammar, vocabulary], index) => ({
    at: `2026-10-0${index + 1}T09:00:00Z`,
    taskId: tasks[index % tasks.length],
    attempt: 1,
    scores: { task, organization, grammar, vocabulary },
  }));
}

function sample(profile: LearningProfile | null, evidence: GoalAttempt[] = []): GoalSummary {
  return goalFromPaths({
    profile,
    paths,
    attempts: evidence,
    weeklyGoal: 5,
    weeklySessions: 2,
    now,
  });
}

export const goalNoneSample = sample(null);
export const goalNoTargetSample = sample({ ...general, targetLevel: null });
export const goalCollectingSample = sample(general, attempts(a2Tasks, [[3, 3, 2, 3]]));
export const goalWorkingSample = sample(
  general,
  attempts(a2Tasks, [
    [3, 3, 2, 3],
    [4, 3, 2, 3],
    [4, 4, 2, 3],
    [4, 3, 3, 4],
  ]),
);
export const goalIeltsSample = sample(
  ieltsGoal,
  attempts(ieltsTasks, [
    [4, 3, 3, 4],
    [4, 4, 3, 3],
    [4, 3, 2, 4],
  ]),
);

// The task an IELTS goal puts on Today, for previews of that goal.
export const goalIeltsNext = nextTask({ chosenLevel: null, units: paths.ielts.units }, 'ielts');
