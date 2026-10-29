import { expect, it } from 'vitest';
import {
  goalTrack,
  hasTarget,
  learningProfile,
  profileInput,
  targetLevelOptions,
  withGoalTarget,
  withStartingLevel,
  type LearningProfile,
} from '@/lib/profile';

const general: LearningProfile = {
  nativeLanguage: 'vi',
  goal: 'general',
  startingLevel: 'A2',
  dailyMinutes: 15,
  targetLevel: null,
  targetScore: null,
  targetDate: null,
};

it('fills the target that matches the goal and keeps a chosen one', () => {
  expect(withGoalTarget(general)).toMatchObject({ targetLevel: 'B1', targetScore: null });
  expect(withGoalTarget({ ...general, targetLevel: 'C1' }).targetLevel).toBe('C1');
  expect(withGoalTarget({ ...general, startingLevel: 'C2' }).targetLevel).toBe('C2');
  const ielts = withGoalTarget({ ...general, goal: 'ielts', targetLevel: 'B2' });
  expect(ielts).toMatchObject({ targetLevel: null, targetScore: 4 });
  expect(withGoalTarget({ ...ielts, goal: 'work' })).toMatchObject({
    targetLevel: 'B1',
    targetScore: null,
  });
});

it('never leaves a target level below the starting level', () => {
  const target = { ...general, targetLevel: 'B1' as const };
  expect(withStartingLevel(target, 'B2').targetLevel).toBe('B2');
  expect(withStartingLevel(target, 'A1').targetLevel).toBe('B1');
  expect(targetLevelOptions('B2')).toEqual(['B2', 'C1', 'C2']);
});

it('accepts stored profiles without targets but requires a matching target to save', () => {
  expect(learningProfile.safeParse(general).success).toBe(true);
  expect(hasTarget(general)).toBe(false);
  expect(profileInput.safeParse(general).success).toBe(false);
  expect(profileInput.safeParse(withGoalTarget(general)).success).toBe(true);
  expect(profileInput.safeParse({ ...general, targetLevel: 'B1', targetScore: 4 }).success).toBe(
    false,
  );
  expect(
    profileInput.safeParse({ ...general, goal: 'ielts', targetScore: 4, targetDate: '2027-02-30' })
      .success,
  ).toBe(false);
});

it('maps only the IELTS goal to the IELTS track', () => {
  expect(goalTrack('ielts')).toBe('ielts');
  for (const goal of ['general', 'work', 'toefl'] as const) expect(goalTrack(goal)).toBe('core');
});
