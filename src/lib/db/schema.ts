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
