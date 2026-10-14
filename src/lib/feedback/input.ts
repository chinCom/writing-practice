import { z } from 'zod';
import { countWords } from '@/lib/draft';
import { textLimits, maxRevisionAttempts } from '@/lib/limits';
import { Level } from './schema';
import { weekendTask, type CurriculumTask } from '@/lib/curriculum';
const Input = z.strictObject({
  taskId: z.string().regex(/^[a-z0-9-]{1,80}$/),
  text: z.string().max(20000),
  attempt: z.number().int().min(1).max(maxRevisionAttempts),
  parentSubmissionId: z.uuid().optional(),
});
export function parseFeedbackInput(
  value: unknown,
  level: z.infer<typeof Level> = 'A2',
  task: CurriculumTask = weekendTask,
) {
  const parsed = Input.parse(value);
  const text = parsed.text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (
    parsed.taskId !== task.id ||
    text.length > textLimits[level] ||
    countWords(text) < task.minWords
  ) {
    throw new Error('INVALID_TEXT');
  }
  if ((parsed.attempt === 1) !== !parsed.parentSubmissionId) {
    throw new Error('INVALID_PARENT');
  }
  return { ...parsed, text };
}
export type FeedbackInput = ReturnType<typeof parseFeedbackInput>;
