import { z } from 'zod';
import { Level } from '@/lib/feedback/schema';
export const profileInput = z.strictObject({
  nativeLanguage: z.enum(['en', 'vi', 'other']),
  goal: z.enum(['general', 'work', 'ielts', 'toefl']),
  startingLevel: Level,
  dailyMinutes: z.union([z.literal(5), z.literal(15), z.literal(30)]),
});
export type LearningProfile = z.infer<typeof profileInput>;
export const profileResult = z.strictObject({
  ok: z.literal(true),
  profile: profileInput.nullable(),
});
