import {
  boolean,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type { LocatedFeedback } from '@/lib/feedback/schema';
import type { Explanation } from '@/lib/feedback/explanation';

const writing = pgSchema('writing');
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
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
