import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type { LocatedFeedback } from '@/lib/feedback/schema';
import type { Explanation } from '@/lib/feedback/explanation';
import type { PracticeSource, PracticeAnswer } from '@/lib/practice';
import type { CorrectionStatus, ReportReason } from '@/lib/feedback/choices';

const writing = pgSchema('writing');
export const curriculumUnits = writing.table('curriculum_units', {
  id: text('id').primaryKey(),
  level: text('level').notNull(),
  sortOrder: integer('sort_order').notNull(),
  content: jsonb('content').$type<import('@/lib/curriculum').CurriculumUnit>().notNull(),
  reviewedBy: text('reviewed_by').notNull(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }).notNull(),
  contentHash: text('content_hash').notNull(),
});
export const placementResults = writing.table('placement_results', {
  userId: uuid('user_id').primaryKey(),
  status: text('status').notNull(),
  result: jsonb('result').$type<import('@/lib/curriculum').PlacementResult>(),
  chosenLevel: text('chosen_level'),
  callsToday: integer('calls_today').notNull(),
  callDay: text('call_day').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});
export const lessonProgress = writing.table(
  'lesson_progress',
  {
    userId: uuid('user_id').notNull(),
    lessonId: text('lesson_id').notNull(),
    warmups: jsonb('warmups').$type<Record<string, boolean>>().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.lessonId] })],
);
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
export const profiles = writing.table('profiles', {
  userId: uuid('user_id').primaryKey(),
  nativeLanguage: text('native_language').notNull(),
  goal: text('goal').notNull(),
  startingLevel: text('starting_level').notNull(),
  dailyMinutes: integer('daily_minutes').notNull(),
  targetLevel: text('target_level'),
  targetScore: numeric('target_score', { precision: 2, scale: 1, mode: 'number' }),
  targetDate: date('target_date', { mode: 'string' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
export const preferences = writing.table('preferences', {
  userId: uuid('user_id').primaryKey(),
  weeklyGoal: integer('weekly_goal').notNull().default(5),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
export const drafts = writing.table(
  'drafts',
  {
    userId: uuid('user_id').notNull(),
    taskId: text('task_id').notNull(),
    text: text('text').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.taskId] })],
);
export const submissions = writing.table('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  taskId: text('task_id').notNull(),
  text: text('text').notNull(),
  wordCount: integer('word_count').notNull(),
  attempt: integer('attempt').notNull(),
  parentSubmissionId: uuid('parent_submission_id'),
  revisionKind: text('revision_kind').$type<'self' | 'assisted'>(),
  benchmarkContext: jsonb('benchmark_context').$type<import('@/lib/benchmarks').BenchmarkContext>(),
  masteryAdvisory: jsonb('mastery_advisory').$type<import('@/lib/mastery').MasteryAssessment>(),
  status: text('status').notNull().default('pending'),
  requestKey: uuid('request_key'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  createdAt: createdAt(),
});
export const feedbackRows = writing.table('feedback', {
  submissionId: uuid('submission_id').primaryKey(),
  userId: uuid('user_id').notNull(),
  json: jsonb('json').$type<LocatedFeedback>().notNull(),
  model: text('model').notNull(),
  promptVersion: text('prompt_version').notNull(),
  createdAt: createdAt(),
});
export const targetEvidence = writing.table(
  'target_evidence',
  {
    submissionId: uuid('submission_id').notNull(),
    userId: uuid('user_id').notNull(),
    tag: text('tag')
      .$type<import('zod').z.infer<typeof import('@/lib/feedback/schema').ErrorTag>>()
      .notNull(),
    level: text('level').$type<import('@/lib/curriculum').CurriculumLevel>().notNull(),
    uses: integer('uses').notNull(),
    errors: integer('errors').notNull(),
    selfFixed: integer('self_fixed'),
    isFirstAttempt: boolean('is_first_attempt').notNull(),
    isBenchmark: boolean('is_benchmark').notNull().default(false),
    graderVersion: text('grader_version').notNull(),
    createdAt: createdAt(),
  },
  (table) => [primaryKey({ columns: [table.submissionId, table.tag] })],
);
export const explanationRows = writing.table(
  'correction_explanations',
  {
    submissionId: uuid('submission_id').notNull(),
    userId: uuid('user_id').notNull(),
    correctionIndex: integer('correction_index').notNull(),
    promptVersion: text('prompt_version').notNull(),
    status: text('status').notNull(),
    json: jsonb('json').$type<Explanation>(),
    mock: boolean('mock').notNull().default(false),
    requestKey: uuid('request_key').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.submissionId, table.correctionIndex, table.promptVersion] }),
  ],
);
export const explanationRequests = writing.table('explanation_requests', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  createdAt: createdAt(),
});
export const practiceSources = writing.table('practice_sources', {
  submissionId: uuid('submission_id').primaryKey(),
  userId: uuid('user_id').notNull(),
});
export const practiceDrills = writing.table('practice_drills', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  submissionId: uuid('submission_id').notNull(),
  correctionIndex: integer('correction_index').notNull(),
  payload: jsonb('payload').$type<PracticeSource>().notNull(),
  box: integer('box').notNull().default(1),
  misses: integer('misses').notNull().default(0),
  version: integer('version').notNull().default(0),
  nextReviewAt: timestamp('next_review_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});
export const practiceAnswers = writing.table(
  'practice_answers',
  {
    drillId: uuid('drill_id').notNull(),
    userId: uuid('user_id').notNull(),
    version: integer('version').notNull(),
    answer: text('answer').notNull(),
    result: jsonb('result').$type<PracticeAnswer>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [primaryKey({ columns: [table.drillId, table.version] })],
);
export const correctionChoices = writing.table(
  'correction_choices',
  {
    submissionId: uuid('submission_id').notNull(),
    userId: uuid('user_id').notNull(),
    correctionIndex: integer('correction_index').notNull(),
    status: text('status').$type<CorrectionStatus>().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.submissionId, table.correctionIndex] })],
);
export const targetAssistance = writing.table(
  'target_assistance',
  {
    submissionId: uuid('submission_id').notNull(),
    userId: uuid('user_id').notNull(),
    correctionIndex: integer('correction_index').notNull(),
    createdAt: createdAt(),
  },
  (table) => [primaryKey({ columns: [table.submissionId, table.correctionIndex] })],
);
export const correctionReports = writing.table(
  'correction_reports',
  {
    submissionId: uuid('submission_id').notNull(),
    userId: uuid('user_id').notNull(),
    correctionIndex: integer('correction_index').notNull(),
    reason: text('reason').$type<ReportReason>().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.submissionId, table.correctionIndex] })],
);
export const aiUsage = writing.table('ai_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  submissionId: uuid('submission_id').notNull(),
  model: text('model').notNull(),
  promptTokens: integer('prompt_tokens').notNull(),
  cacheHitTokens: integer('cache_hit_tokens').notNull().default(0),
  completionTokens: integer('completion_tokens').notNull(),
  latencyMs: integer('latency_ms').notNull(),
  mock: boolean('mock').notNull().default(false),
  createdAt: createdAt(),
});
