import { z } from 'zod';
import { ErrorTag } from './feedback/schema';

export const curriculumTrack = z.enum(['core', 'ielts']);
export type CurriculumTrack = z.infer<typeof curriculumTrack>;
export function trackForId(id: string): CurriculumTrack {
  return id.startsWith('ielts-') ? 'ielts' : 'core';
}
export function ieltsModule(id: string): 'academic' | 'general' | 'essay' | null {
  if (trackForId(id) !== 'ielts') return null;
  if (id.startsWith('ielts-task2-')) return 'essay';
  return id.startsWith('ielts-task1-general-') ? 'general' : 'academic';
}
export function getTrackUnits<T extends { id: string }>(units: T[], track: CurriculumTrack): T[] {
  return units.filter((unit) => trackForId(unit.id) === track);
}

export const curriculumLevel = z.enum(['PRE_A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
export const courseRanges = {
  PRE_A1: [5, 20],
  A1: [20, 50],
  A2: [40, 100],
  B1: [100, 180],
  B2: [180, 300],
  C1: [250, 400],
  C2: [300, 500],
} as const;
export const warmupSchema = z.strictObject({
  type: z.enum(['gap-fill', 'reorder', 'fix-the-error', 'choose']),
  prompt: z.string().min(1).max(500),
  options: z.array(z.string().max(100)).max(8).optional(),
  answer: z.string().min(1).max(300),
  hint: z.string().min(1).max(300),
});
export const taskSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]{1,80}$/),
  title: z.string().min(1).max(150),
  genre: z.string().min(1).max(80),
  prompt: z.string().min(1).max(1000),
  scaffold: z.enum(['frames', 'wordbank', 'checklist', 'outline', 'none']),
  frames: z.array(z.string().max(300)).max(6).optional(),
  wordBank: z.array(z.string().max(100)).max(12),
  checklist: z.array(z.string().max(200)).min(1).max(5),
  minWords: z.number().int().min(5).max(500),
  maxWords: z.number().int().min(5).max(500),
  isCheckpoint: z.boolean(),
  targetLevel: curriculumLevel,
  reading: z
    .strictObject({
      mode: z.enum(['summary', 'continuation']),
      title: z.string().min(1).max(150),
      text: z.string().min(30).max(3000),
    })
    .optional(),
});
export const noticingSchema = z.strictObject({
  instruction: z.string().min(1).max(500),
  spans: z
    .array(z.strictObject({ start: z.number().int().min(0), end: z.number().int().positive() }))
    .min(2)
    .max(6),
  explanation: z.string().min(1).max(500),
});
export const lessonSchema = z
  .strictObject({
    id: z.string().regex(/^[a-z0-9-]{1,80}$/),
    title: z.string().min(1).max(150),
    miniLesson: z.strictObject({
      markdown: z.string().min(1).max(3000),
      modelText: z.string().min(1).max(6500),
    }),
    warmups: z.array(warmupSchema).min(2).max(6),
    task: taskSchema,
    noticing: noticingSchema.optional(),
  })
  .superRefine((lesson, context) => {
    const spans = lesson.noticing?.spans ?? [];
    const text = lesson.miniLesson.modelText;
    const sorted = [...spans].sort((a, b) => a.start - b.start);
    if (
      sorted.some(
        (span, index) =>
          span.end <= span.start ||
          span.end > text.length ||
          (index > 0 && span.start < sorted[index - 1].end),
      )
    )
      context.addIssue({
        code: 'custom',
        message: 'Noticing spans must be distinct, non-overlapping model-text ranges',
      });
  });
export const transferDrillSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]{1,80}$/),
  tag: ErrorTag,
  prompt: z.string().min(1).max(500),
  answers: z.array(z.string().min(1).max(300)).min(1).max(5),
  explanation: z.string().min(1).max(500),
});
export const unitSchema = z
  .strictObject({
    id: z.string().regex(/^[a-z0-9-]{1,80}$/),
    level: curriculumLevel,
    order: z.number().int().min(1).max(20),
    title: z.string().min(1).max(150),
    theme: z.string().min(1).max(150),
    outcome: z.string().min(1).max(300),
    grammarFocus: z.array(ErrorTag).min(1).max(5),
    vocabulary: z.array(z.string().max(100)).max(20),
    lessons: z.array(lessonSchema).min(1).max(6),
    transferDrills: z.array(transferDrillSchema).max(12).optional(),
    parallelPrompt: taskSchema.optional(),
  })
  .superRefine((unit, context) => {
    const first = unit.lessons[0].task;
    const parallel = unit.parallelPrompt;
    if (
      parallel &&
      (!parallel.isCheckpoint ||
        parallel.genre !== first.genre ||
        parallel.targetLevel !== unit.level ||
        parallel.minWords !== first.minWords ||
        parallel.maxWords !== first.maxWords ||
        parallel.id !== unit.lessons.at(-1)?.task.id)
    )
      context.addIssue({
        code: 'custom',
        message:
          'Parallel checkpoint must match the first task genre, range, level and checkpoint ID',
      });
    const drills = unit.transferDrills ?? [];
    if (
      new Set(drills.map((item) => item.id)).size !== drills.length ||
      drills.some((item) => !unit.grammarFocus.includes(item.tag))
    )
      context.addIssue({
        code: 'custom',
        message: 'Transfer drills need distinct IDs and unit focus tags',
      });
  });
export const curriculumSchema = z
  .array(unitSchema)
  .min(3)
  .max(60)
  .superRefine((units, context) => {
    const ids = new Set<string>();
    for (const unit of units) {
      for (const id of [
        unit.id,
        ...unit.lessons.flatMap((lesson) => [lesson.id, lesson.task.id]),
      ]) {
        if (ids.has(id))
          context.addIssue({ code: 'custom', message: 'Duplicate content id: ' + id });
        ids.add(id);
      }
      for (const lesson of unit.lessons) {
        const task = lesson.task;
        if (
          trackForId(lesson.id) !== trackForId(unit.id) ||
          trackForId(task.id) !== trackForId(unit.id)
        )
          context.addIssue({
            code: 'custom',
            message: 'Lesson and task IDs must match their unit track',
          });
        const modelWords = lesson.miniLesson.modelText.trim().split(/\s+/).length;
        if (modelWords < task.minWords || modelWords > task.maxWords)
          context.addIssue({
            code: 'custom',
            message: 'Model text must match its task word range',
          });
        const ranges =
          ieltsModule(unit.id) === 'essay'
            ? [250, 350]
            : trackForId(unit.id) === 'ielts'
              ? [150, 180]
              : courseRanges[unit.level];
        if (
          task.targetLevel !== unit.level ||
          task.minWords !== ranges[0] ||
          task.maxWords !== ranges[1]
        )
          context.addIssue({ code: 'custom', message: 'Incorrect task level or word range' });
      }
      for (const lesson of unit.lessons) {
        for (const warmup of lesson.warmups) {
          if (
            warmup.type === 'choose' &&
            (!warmup.options || !warmup.options.includes(warmup.answer))
          )
            context.addIssue({
              code: 'custom',
              message: 'Choice warm-up needs its exact answer in the options',
            });
        }
      }
      if (!unit.lessons.at(-1)?.task.isCheckpoint)
        context.addIssue({ code: 'custom', message: 'Each unit needs a final checkpoint' });
    }
    for (const level of new Set(units.map((unit) => unit.level))) {
      const orders = units
        .filter((unit) => unit.level === level && trackForId(unit.id) === 'core')
        .map((unit) => unit.order)
        .sort((a, b) => a - b);
      if (orders.some((order, index) => order !== index + 1))
        context.addIssue({ code: 'custom', message: 'Unit order must start at one with no gaps' });
    }
  });
export type CurriculumUnit = z.infer<typeof unitSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type CurriculumTask = z.infer<typeof taskSchema>;
export type Warmup = z.infer<typeof warmupSchema>;
export type CurriculumLevel = z.infer<typeof curriculumLevel>;
export type PublicLesson = Omit<Lesson, 'warmups' | 'noticing'> & {
  warmups: Omit<Warmup, 'answer' | 'hint'>[];
  noticing?: Pick<NonNullable<Lesson['noticing']>, 'instruction'>;
};
export function publicLesson(lesson: Lesson): PublicLesson {
  const { noticing, ...ordinary } = lesson;
  return {
    ...ordinary,
    ...(noticing ? { noticing: { instruction: noticing.instruction } } : {}),
    warmups: lesson.warmups.map(({ type, prompt, options }) => ({
      type,
      prompt,
      ...(options ? { options } : {}),
    })),
  };
}
export function gradeWarmup(warmup: Warmup, answer: string) {
  const normalize = (value: string) =>
    value
      .normalize('NFKC')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .replace(/[.!?]$/, '');
  return normalize(answer) === normalize(warmup.answer);
}
export function passesCheckpoint(
  scores: { task: number; organization: number; grammar: number; vocabulary: number },
  safety: boolean,
) {
  return (
    !safety &&
    scores.grammar >= 3 &&
    Object.values(scores).reduce((sum, value) => sum + value, 0) / 4 >= 3.5
  );
}
export const placementInput = z.strictObject({
  samples: z.tuple([z.string().trim().min(30).max(1200), z.string().trim().min(30).max(1200)]),
  answers: z.tuple([
    z.string().min(1).max(100),
    z.string().min(1).max(100),
    z.string().min(1).max(100),
  ]),
});
export const placementOutput = z.strictObject({
  cefr: z.enum(['A1', 'A2', 'B1']),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1).max(400),
  safety_flag: z.boolean(),
});
export type PlacementResult = z.infer<typeof placementOutput>;
export const placementQuestions = [
  { prompt: 'She ___ a teacher.', options: ['is', 'are', 'be'], answer: 'is' },
  { prompt: 'Yesterday, I ___ to the park.', options: ['go', 'went', 'going'], answer: 'went' },
  {
    prompt: 'I stayed home ___ I was tired.',
    options: ['because', 'but', 'so'],
    answer: 'because',
  },
];
export const weekendTask: CurriculumTask = {
  id: 'weekend',
  title: 'A message to a friend',
  genre: 'message',
  prompt: 'Write about your weekend. Invite your friend to join you next time.',
  scaffold: 'checklist',
  wordBank: ['Last weekend', 'In the evening', 'Would you like to'],
  checklist: ['Say where you went', 'Describe what you did', 'Invite your friend'],
  minWords: 40,
  maxWords: 100,
  isCheckpoint: false,
  targetLevel: 'A2',
};
