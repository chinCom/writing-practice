import 'server-only';
import { cookies } from 'next/headers';
import { courseDraft } from './course-content';
import { buildCoursePath } from '@/lib/curriculum-path';
const lessons = courseDraft.flatMap((unit) => unit.lessons);
export async function coursePreview() {
  let state: { warmups: Record<string, boolean>; written: number[] } = { warmups: {}, written: [] };
  try {
    const value = JSON.parse((await cookies()).get('course-preview')?.value ?? '{}');
    if (value.warmups && Array.isArray(value.written)) state = value;
  } catch {
    /* Invalid local preview state starts an empty synthetic path. */
  }
  const progress = lessons.map((lesson, index) => ({
    lessonId: lesson.id,
    warmups: Object.fromEntries(
      lesson.warmups.map((_, i) => [String(i), Boolean(state.warmups[index + ':' + i])]),
    ),
  }));
  const checks = state.written.map((index) => ({
    taskId: lessons[index]?.task.id ?? '',
    feedback: {
      safety_flag: false,
      scores: { task: 4, organization: 4, grammar: 4, vocabulary: 4 },
    },
  }));
  return {
    state,
    lessons,
    path: {
      chosenLevel: 'PRE_A1' as const,
      placement: null,
      units: buildCoursePath(courseDraft, 'PRE_A1', progress, checks),
    },
  };
}
