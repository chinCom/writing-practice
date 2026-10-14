import { z } from 'zod';
export const weeklyGoalSchema = z.union([z.literal(3), z.literal(5), z.literal(7)]);
export type WeeklyGoal = z.infer<typeof weeklyGoalSchema>;
export const preferencesInput = z.strictObject({ weeklyGoal: weeklyGoalSchema });
export const preferencesResult = preferencesInput.extend({ ok: z.literal(true) });
