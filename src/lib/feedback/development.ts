import { z } from 'zod';
import type { CurriculumTask } from '@/lib/curriculum';
import { textLimits } from '@/lib/limits';

export const DevelopmentSchema = z.strictObject({
  encouragement: z.string().trim().min(1).max(220),
  question: z.string().trim().min(1).max(220),
  sentence_starter: z.string().trim().max(180),
  next_step: z.string().trim().min(1).max(220),
  safety_flag: z.boolean(),
});
export type Development = z.infer<typeof DevelopmentSchema>;
export const developmentInput = z.strictObject({
  taskId: z.string().regex(/^[a-z0-9-]{1,80}$/),
  text: z.string().trim().min(1).max(6500),
});
export function parseDevelopmentInput(input: unknown, task: CurriculumTask) {
  const parsed = developmentInput.parse(input);
  if (parsed.taskId !== task.id || parsed.text.length > textLimits[task.targetLevel])
    throw new Error('INVALID_INPUT');
  return parsed;
}
