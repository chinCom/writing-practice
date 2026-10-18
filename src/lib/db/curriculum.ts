import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { withUserDatabase, type Transaction } from './client';
import {
  curriculumUnits,
  placementResults,
  lessonProgress,
  submissions,
  feedbackRows,
} from './schema';
import {
  curriculumSchema,
  gradeWarmup,
  weekendTask,
  type CurriculumLevel,
  type CurriculumTrack,
  trackForId,
} from '@/lib/curriculum';
import { DomainError } from '@/lib/domain-error';
import { gradeNoticing, type TextSpan } from '@/lib/noticing';
import { buildCoursePath } from '@/lib/curriculum-path';
import { trustedTargetsInTransaction } from './targets';

export async function pathInTransaction(database: Transaction, track: CurriculumTrack = 'core') {
  const [units, [placement], progress, checks] = await Promise.all([
    database.select({ content: curriculumUnits.content }).from(curriculumUnits),
    database.select().from(placementResults),
    database.select().from(lessonProgress),
    database
      .select({
        taskId: submissions.taskId,
        at: submissions.createdAt,
        feedback: feedbackRows.json,
        masteryAdvisory: submissions.masteryAdvisory,
      })
      .from(submissions)
      .innerJoin(feedbackRows, eq(submissions.id, feedbackRows.submissionId))
      .where(eq(submissions.status, 'completed')),
  ]);
  const content = units.length ? curriculumSchema.parse(units.map((unit) => unit.content)) : [];
  const chosenLevel = (placement?.chosenLevel as CurriculumLevel | null) ?? null;
  return {
    chosenLevel,
    placement: placement?.result ?? null,
    units: buildCoursePath(content, chosenLevel, progress, checks, track),
  };
}
export type LearningPath = Awaited<ReturnType<typeof pathInTransaction>>;
export async function loadPath(userId: string, track: CurriculumTrack = 'core') {
  return withUserDatabase(userId, (database) => pathInTransaction(database, track));
}
async function lessonInTransaction(database: Transaction, lessonId: string) {
  const path = await pathInTransaction(database, trackForId(lessonId));
  const lesson = path.units.flatMap((unit) => unit.lessons).find((item) => item.id === lessonId);
  if (!lesson) throw new DomainError('NOT_FOUND');
  if (lesson.state === 'locked') throw new DomainError('LESSON_LOCKED');
  return lesson;
}
export async function loadLesson(userId: string, lessonId: string) {
  return withUserDatabase(userId, (database) => lessonInTransaction(database, lessonId));
}
export async function loadTask(userId: string, taskId: string) {
  return (await loadTaskContext(userId, taskId)).task;
}
export async function loadTaskContext(userId: string, taskId: string) {
  if (taskId === 'weekend') return { task: weekendTask, targets: [] };
  return withUserDatabase(userId, async (database) => {
    const path = await pathInTransaction(database, trackForId(taskId));
    const unit = path.units.find((item) =>
      item.lessons.some((lesson) => lesson.task.id === taskId),
    );
    const lesson = unit?.lessons.find((item) => item.task.id === taskId);
    if (!lesson) throw new DomainError('NOT_FOUND');
    if (lesson.state === 'locked') throw new DomainError('LESSON_LOCKED');
    if (!lesson.warmupsDone) throw new DomainError('WARMUPS_REQUIRED');
    return { task: lesson.task, targets: await trustedTargetsInTransaction(database, unit!) };
  });
}
export async function answerWarmup(
  userId: string,
  lessonId: string,
  index: number,
  answer: string,
) {
  return withUserDatabase(userId, async (database) => {
    await database.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 3))`);
    const lesson = await lessonInTransaction(database, lessonId);
    const [unit] = await database
      .select({ content: curriculumUnits.content })
      .from(curriculumUnits)
      .where(
        sql`${curriculumUnits.content}->'lessons' @> ${JSON.stringify([{ id: lessonId }])}::jsonb`,
      );
    const warmup = unit?.content.lessons.find((item) => item.id === lessonId)?.warmups[index];
    if (!warmup) throw new DomainError('INVALID_INPUT');
    const correct = gradeWarmup(warmup, answer);
    const answers = { ...lesson.answers };
    if (correct) answers[String(index)] = true;
    const done = lesson.warmups.every((_, i) => answers[String(i)] === true);
    await database
      .insert(lessonProgress)
      .values({ userId, lessonId, warmups: answers, completedAt: done ? new Date() : null })
      .onConflictDoUpdate({
        target: [lessonProgress.userId, lessonProgress.lessonId],
        // Keep the first completion date when a finished warm-up is answered again.
        set: {
          warmups: answers,
          completedAt: done ? sql`coalesce(${lessonProgress.completedAt}, now())` : null,
        },
      });
    return { correct, hint: correct ? null : warmup.hint, warmupsDone: done, answers };
  });
}
export async function answerNoticing(userId: string, lessonId: string, selected: TextSpan[]) {
  return withUserDatabase(userId, async (database) => {
    await lessonInTransaction(database, lessonId);
    const [unit] = await database
      .select({ content: curriculumUnits.content })
      .from(curriculumUnits)
      .where(
        sql`${curriculumUnits.content}->'lessons' @> ${JSON.stringify([{ id: lessonId }])}::jsonb`,
      );
    const exercise = unit?.content.lessons.find((lesson) => lesson.id === lessonId)?.noticing;
    if (!exercise) throw new DomainError('NOT_FOUND');
    const correct = gradeNoticing(exercise, selected);
    return { correct, ...(correct ? { explanation: exercise.explanation } : {}) };
  });
}
