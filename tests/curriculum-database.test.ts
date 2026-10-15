import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { sql } from 'drizzle-orm';
import { beforeAll, afterAll, expect, it, vi } from 'vitest';
import { curriculumDraft } from '@/mocks/curriculum-content';
import {
  loadPath,
  answerWarmup,
  loadLesson,
  choosePlacement,
  reservePlacement,
  completePlacement,
  loadTask,
} from '@/lib/db/curriculum';
const database = new PGlite();
const alice = '00000000-0000-4000-8000-000000000011';
const bob = '00000000-0000-4000-8000-000000000012';
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/client', () => ({
  withUserDatabase: (userId: string, work: (transaction: unknown) => Promise<unknown>) =>
    drizzle(database).transaction(async (transaction) => {
      await transaction.execute(sql`SELECT set_config('request.jwt.claim.sub', ${userId}, true)`);
      await transaction.execute(sql`SET LOCAL ROLE authenticated`);
      return work(transaction);
    }),
}));
beforeAll(async () => {
  await database.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS 'SELECT nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
 GRANT USAGE ON SCHEMA auth TO authenticated; INSERT INTO auth.users VALUES ('${alice}'),('${bob}');`);
  await database.exec(await readFile('drizzle/0000_writing.sql', 'utf8'));
  await database.exec(await readFile('drizzle/0008_curriculum.sql', 'utf8'));
  await database.exec(await readFile('drizzle/0009_writing_course.sql', 'utf8'));
  for (const unit of curriculumDraft)
    await database.query('INSERT INTO writing.curriculum_units VALUES ($1,$2,$3,$4,$5,now(),$6)', [
      unit.id,
      unit.level,
      unit.order,
      JSON.stringify(unit),
      'Test reviewer',
      'synthetic-hash',
    ]);
});
afterAll(() => database.close());
it('keeps the path blocked until placement is accepted, then opens only the starting lesson', async () => {
  expect((await loadPath(alice)).chosenLevel).toBeNull();
  await expect(loadLesson(alice, 'about-me')).rejects.toThrow('LESSON_LOCKED');
  await reservePlacement(alice);
  await completePlacement(alice, {
    cefr: 'A1',
    confidence: 0.8,
    reason: 'Simple sentences.',
    safety_flag: false,
  });
  await choosePlacement(alice, 'A1');
  const path = await loadPath(alice);
  expect(path.units[0].lessons.map((lesson) => lesson.state)).toEqual(['current', 'locked']);
  expect(await loadLesson(alice, 'about-me')).not.toBeNull();
  await expect(loadTask(alice, 'friendly-invitation-task')).rejects.toThrow('LESSON_LOCKED');
  expect((await loadPath(bob)).chosenLevel).toBeNull();
});
it('grades answers on the server but requires saved safe writing before unlocking the next lesson', async () => {
  const first = curriculumDraft[0].lessons[0];
  expect(await answerWarmup(alice, first.id, 0, 'wrong')).toMatchObject({
    correct: false,
    hint: first.warmups[0].hint,
  });
  expect((await loadPath(alice)).units[0].lessons[1].state).toBe('locked');
  await answerWarmup(alice, first.id, 0, first.warmups[0].answer);
  await answerWarmup(alice, first.id, 1, first.warmups[1].answer);
  const completedAt = () =>
    database
      .query<{ at: string }>(
        'SELECT completed_at::text AS at FROM writing.lesson_progress WHERE user_id = $1 AND lesson_id = $2',
        [alice, first.id],
      )
      .then((result) => result.rows[0].at);
  const finished = await completedAt();
  // Answering a finished warm-up again must not move the lesson's completion date.
  await answerWarmup(alice, first.id, 0, first.warmups[0].answer);
  expect(await completedAt()).toBe(finished);
  expect((await loadPath(alice)).units[0].lessons.map((lesson) => lesson.state)).toEqual([
    'current',
    'locked',
  ]);
  expect((await loadLesson(alice, first.id)).warmups[0]).not.toHaveProperty('answer');
  const writingId = '00000000-0000-4000-8000-000000000019';
  await database.query(
    `INSERT INTO writing.submissions(id,user_id,task_id,text,word_count,attempt,status) VALUES ($1,$2,$3,'Synthetic writing',20,1,'completed')`,
    [writingId, alice, first.task.id],
  );
  await database.query(
    `INSERT INTO writing.feedback(submission_id,user_id,json,model,prompt_version) VALUES ($1,$2,$3,'test','test')`,
    [
      writingId,
      alice,
      JSON.stringify({
        safety_flag: false,
        scores: { task: 2, organization: 2, grammar: 2, vocabulary: 2 },
      }),
    ],
  );
  expect((await loadPath(alice)).units[0].lessons.map((lesson) => lesson.state)).toEqual([
    'done',
    'current',
  ]);
  await expect(answerWarmup(alice, first.id, 99, 'forged')).rejects.toThrow('INVALID_INPUT');
  await expect(answerWarmup(bob, first.id, 0, first.warmups[0].answer)).rejects.toThrow(
    'LESSON_LOCKED',
  );
});
it('blocks the next level until a safe checkpoint meets the rubric floor', async () => {
  const checkpoint = curriculumDraft[0].lessons[1];
  for (const [index, warmup] of checkpoint.warmups.entries())
    await answerWarmup(alice, checkpoint.id, index, warmup.answer);
  expect((await loadPath(alice)).units[1].lessons[0].state).toBe('locked');
  const id = '00000000-0000-4000-8000-000000000020';
  await database.query(
    `INSERT INTO writing.submissions(id,user_id,task_id,text,word_count,attempt,status) VALUES ($1,$2,$3,'Test writing',20,1,'completed')`,
    [id, alice, checkpoint.task.id],
  );
  const feedback = {
    safety_flag: false,
    scores: { task: 4, organization: 4, grammar: 2, vocabulary: 5 },
  };
  await database.query(
    `INSERT INTO writing.feedback(submission_id,user_id,json,model,prompt_version) VALUES ($1,$2,$3,'test','test')`,
    [id, alice, JSON.stringify(feedback)],
  );
  expect((await loadPath(alice)).units[1].lessons[0].state).toBe('locked');
  await database.query('UPDATE writing.feedback SET json=$1 WHERE submission_id=$2', [
    JSON.stringify({
      ...feedback,
      scores: { task: 4, organization: 4, grammar: 3, vocabulary: 3 },
    }),
    id,
  ]);
  expect((await loadPath(alice)).units[1].lessons[0].state).toBe('current');
});
it('limits placement attempts and does not accept results from another owner or a safety-flagged result', async () => {
  await expect(choosePlacement(bob, 'B1')).rejects.toThrow('PLACEMENT_REQUIRED');
  await reservePlacement(bob);
  await expect(reservePlacement(bob)).rejects.toThrow('PLACEMENT_PENDING');
  await completePlacement(bob, {
    cefr: 'A1',
    confidence: 0.5,
    reason: 'Support first.',
    safety_flag: true,
  });
  await expect(choosePlacement(bob, 'A1')).rejects.toThrow('PLACEMENT_REQUIRED');
  await reservePlacement(bob);
  await completePlacement(bob, {
    cefr: 'A2',
    confidence: 0.7,
    reason: 'Connected writing.',
    safety_flag: false,
  });
  await reservePlacement(bob);
  await completePlacement(bob, {
    cefr: 'A2',
    confidence: 0.7,
    reason: 'Connected writing.',
    safety_flag: false,
  });
  await expect(reservePlacement(bob)).rejects.toThrow('PLACEMENT_LIMIT');
});
