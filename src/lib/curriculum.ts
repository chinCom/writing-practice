import { z } from 'zod';
import { ErrorTag } from './feedback/schema';

export const curriculumLevel = z.enum(['A1', 'A2', 'B1']);
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
  scaffold: z.enum(['frames', 'wordbank', 'checklist', 'outline']),
  frames: z.array(z.string().max(300)).max(6).optional(),
  wordBank: z.array(z.string().max(100)).max(12),
  checklist: z.array(z.string().max(200)).min(1).max(5),
  minWords: z.number().int().min(20).max(180),
  maxWords: z.number().int().min(20).max(180),
  isCheckpoint: z.boolean(),
  targetLevel: curriculumLevel,
});
export const lessonSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]{1,80}$/),
  title: z.string().min(1).max(150),
  miniLesson: z.strictObject({
    markdown: z.string().min(1).max(3000),
    modelText: z.string().min(1).max(2000),
  }),
  warmups: z.array(warmupSchema).min(2).max(6),
  task: taskSchema,
});
export const unitSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]{1,80}$/),
  level: curriculumLevel,
  order: z.number().int().min(1).max(20),
  title: z.string().min(1).max(150),
  theme: z.string().min(1).max(150),
  outcome: z.string().min(1).max(300),
  grammarFocus: z.array(ErrorTag).min(1).max(5),
  vocabulary: z.array(z.string().max(100)).max(20),
  lessons: z.array(lessonSchema).min(1).max(6),
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
        const ranges = { A1: [20, 50], A2: [40, 100], B1: [100, 180] } as const;
        if (
          task.targetLevel !== unit.level ||
          task.minWords !== ranges[unit.level][0] ||
          task.maxWords !== ranges[unit.level][1]
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
    for (const level of curriculumLevel.options) {
      const orders = units
        .filter((unit) => unit.level === level)
        .map((unit) => unit.order)
        .sort((a, b) => a - b);
      if (!orders.length || orders.some((order, index) => order !== index + 1))
        context.addIssue({ code: 'custom', message: 'Unit order must start at one with no gaps' });
    }
  });
export type CurriculumUnit = z.infer<typeof unitSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type CurriculumTask = z.infer<typeof taskSchema>;
export type Warmup = z.infer<typeof warmupSchema>;
export type CurriculumLevel = z.infer<typeof curriculumLevel>;
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
  cefr: curriculumLevel,
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
