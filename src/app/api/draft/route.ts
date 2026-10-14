import { z } from 'zod';
import { NextResponse } from 'next/server';
import { apiFailure, ApiError, readJson, requireApiUser } from '@/lib/api';
import { saveDraft } from '@/lib/db/queries';
import { loadTask } from '@/lib/db/curriculum';
import { textLimits } from '@/lib/limits';
const DraftInput = z.strictObject({
  text: z.string().max(2000),
  taskId: z
    .string()
    .regex(/^[a-z0-9-]{1,80}$/)
    .optional(),
});
export async function PUT(request: Request) {
  try {
    const user = await requireApiUser(request);
    const input = DraftInput.safeParse(await readJson(request));
    if (!input.success) throw new ApiError('INVALID_INPUT', 400);
    const task = await loadTask(user.id, input.data.taskId ?? 'weekend');
    if (input.data.text.length > textLimits[task.targetLevel])
      throw new ApiError('INVALID_INPUT', 400);
    await saveDraft(user.id, input.data.text, task.id);
    return NextResponse.json({ ok: true, data: { saved: true } });
  } catch (error) {
    return apiFailure(error);
  }
}
