import { z } from 'zod';
import { countWords } from '@/lib/draft';
import { textLimits } from '@/lib/limits';
import { Level } from './schema';
const Input = z.strictObject({
  taskId: z.literal('weekend'),
  text: z.string().max(20000),
  attempt: z.number().int().min(1).max(20),
  parentSubmissionId: z.uuid().optional(),
});
export function parseFeedbackInput(value: unknown, level: z.infer<typeof Level> = 'A2') {
  const parsed = Input.parse(value);
  const text = parsed.text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (text.length > textLimits[level] || countWords(text) < 40) {
    throw new Error('INVALID_TEXT');
  }
  if ((parsed.attempt === 1) !== !parsed.parentSubmissionId) {
    throw new Error('INVALID_PARENT');
  }
  return { ...parsed, text };
}
export type FeedbackInput = ReturnType<typeof parseFeedbackInput>;
