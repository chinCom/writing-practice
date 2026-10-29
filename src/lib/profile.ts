import { z } from 'zod';
import { Level } from '@/lib/feedback/schema';

// IELTS targets use the app's practice scale, never official bands.
export const targetScores = [3, 3.5, 4, 4.5, 5] as const;
const targetScore = z.union(targetScores.map((score) => z.literal(score)));
const isoDate = z.iso.date();

// Stored profiles: older rows were saved before goals had targets, so targets may be empty.
export const learningProfile = z.strictObject({
  nativeLanguage: z.enum(['en', 'vi', 'other']),
  goal: z.enum(['general', 'work', 'ielts', 'toefl']),
  startingLevel: Level,
  dailyMinutes: z.union([z.literal(5), z.literal(15), z.literal(30)]),
  targetLevel: Level.nullable(),
  targetScore: targetScore.nullable(),
  targetDate: isoDate.nullable(),
});
export type LearningProfile = z.infer<typeof learningProfile>;
export type LearningGoal = LearningProfile['goal'];

/** A saved profile always names the target that matches its goal, and only that target. */
export const profileInput = learningProfile.superRefine((profile, context) => {
  const ielts = profile.goal === 'ielts';
  if (ielts ? profile.targetScore === null : profile.targetLevel === null)
    context.addIssue({ code: 'custom', message: 'Target required for this goal.' });
  if (ielts ? profile.targetLevel !== null : profile.targetScore !== null)
    context.addIssue({ code: 'custom', message: 'Target does not match this goal.' });
});

export const profileResult = z.strictObject({
  ok: z.literal(true),
  profile: learningProfile.nullable(),
});

export function goalTrack(goal: LearningGoal): 'core' | 'ielts' {
  return goal === 'ielts' ? 'ielts' : 'core';
}

export function hasTarget(profile: LearningProfile) {
  return profile.goal === 'ielts' ? profile.targetScore !== null : profile.targetLevel !== null;
}

const levels = Level.options;
const defaultTargetScore = 4;

/** One level above the start, so a first target is reachable but asks for growth. */
function levelAbove(level: LearningProfile['startingLevel']) {
  return levels[Math.min(levels.indexOf(level) + 1, levels.length - 1)];
}

/** Fills the target that matches the goal, keeping one the learner already chose. */
export function withGoalTarget(profile: LearningProfile): LearningProfile {
  if (profile.goal === 'ielts')
    return {
      ...profile,
      targetLevel: null,
      targetScore: profile.targetScore ?? defaultTargetScore,
    };
  return {
    ...profile,
    targetScore: null,
    targetLevel: profile.targetLevel ?? levelAbove(profile.startingLevel),
  };
}

/** A target level never sits below the starting level. */
export function withStartingLevel(
  profile: LearningProfile,
  startingLevel: LearningProfile['startingLevel'],
): LearningProfile {
  const target = profile.targetLevel;
  const below = target !== null && levels.indexOf(target) < levels.indexOf(startingLevel);
  return { ...profile, startingLevel, targetLevel: below ? startingLevel : target };
}

export function targetLevelOptions(startingLevel: LearningProfile['startingLevel']) {
  return levels.slice(levels.indexOf(startingLevel));
}
