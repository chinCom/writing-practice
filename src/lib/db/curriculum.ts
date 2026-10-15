import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { withUserDatabase } from './client';
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
  placementOutput,
  weekendTask,
  type CurriculumLevel,
  type PlacementResult,
  type CurriculumTrack,
  trackForId,
} from '@/lib/curriculum';
import { ApiError } from '@/lib/api';
import { buildCoursePath } from '@/lib/curriculum-path';
import { targetsForUnit } from '@/lib/targets';

type Transaction = Parameters<Parameters<typeof withUserDatabase>[1]>[0];
export async function pathInTransaction(database: Transaction, track: CurriculumTrack = 'core') {
  const units = await database.select({ content: curriculumUnits.content }).from(curriculumUnits);
  const content = units.length ? curriculumSchema.parse(units.map((unit) => unit.content)) : [];
  const [placement] = await database.select().from(placementResults);
  const progress = await database.select().from(lessonProgress);
  const checks = await database
    .select({ taskId: submissions.taskId, at: submissions.createdAt, feedback: feedbackRows.json })
    .from(submissions)
    .innerJoin(feedbackRows, eq(submissions.id, feedbackRows.submissionId))
    .where(eq(submissions.status, 'completed'));
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
  if (!lesson) throw new ApiError('NOT_FOUND', 404);
  if (lesson.state === 'locked') throw new ApiError('LESSON_LOCKED', 403);
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
    if (!lesson) throw new ApiError('NOT_FOUND', 404);
    if (lesson.state === 'locked') throw new ApiError('LESSON_LOCKED', 403);
    if (!lesson.warmupsDone) throw new ApiError('WARMUPS_REQUIRED', 403);
    return { task: lesson.task, targets: targetsForUnit(unit!) };
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
    if (!warmup) throw new ApiError('INVALID_INPUT', 400);
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
export async function reservePlacement(userId: string) {
  return withUserDatabase(userId, async (database) => {
    await database.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 3))`);
    const [previous] = await database.select().from(placementResults);
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (previous?.status === 'pending' && now.getTime() - previous.startedAt.getTime() < 60000)
      throw new ApiError('PLACEMENT_PENDING', 409);
    const calls = previous?.callDay === today ? previous.callsToday : 0;
    if (calls >= 3) throw new ApiError('PLACEMENT_LIMIT', 429);
    await database
      .insert(placementResults)
      .values({
        userId,
        status: 'pending',
        callsToday: calls + 1,
        callDay: today,
        startedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: placementResults.userId,
        set: {
          status: 'pending',
          callsToday: calls + 1,
          callDay: today,
          startedAt: now,
          updatedAt: now,
        },
      });
  });
}
export async function completePlacement(userId: string, result: PlacementResult) {
  return withUserDatabase(userId, async (database) => {
    await database
      .update(placementResults)
      .set({ status: 'completed', result: placementOutput.parse(result), updatedAt: new Date() })
      .where(eq(placementResults.userId, userId));
  });
}
export async function failPlacement(userId: string) {
  return withUserDatabase(userId, async (database) => {
    await database
      .update(placementResults)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(eq(placementResults.userId, userId));
  });
}
export async function choosePlacement(userId: string, level: CurriculumLevel) {
  return withUserDatabase(userId, async (database) => {
    const [result] = await database.select().from(placementResults);
    if (result?.status !== 'completed' || !result.result || result.result.safety_flag)
      throw new ApiError('PLACEMENT_REQUIRED', 400);
    await database
      .update(placementResults)
      .set({ chosenLevel: level, updatedAt: new Date() })
      .where(and(eq(placementResults.userId, userId), eq(placementResults.status, 'completed')));
    return { chosenLevel: level };
  });
}
