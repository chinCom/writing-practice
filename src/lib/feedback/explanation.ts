import { z } from 'zod';

export const ExplanationSchema = z.strictObject({
  why_original: z.string().trim().min(1).max(500),
  why_suggestion: z.string().trim().min(1).max(500),
});
export type Explanation = z.infer<typeof ExplanationSchema>;
export const explanationPromptVersion = 'correction-explain-v1';
