import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { sql } from 'drizzle-orm';
import { beforeAll, afterAll, expect, it, vi } from 'vitest';
import { curriculumDraft } from '@/mocks/curriculum-content';
import { loadTransfer, answerTransfer } from '@/lib/db/transfer';
import {
  loadPath,
  answerWarmup,
  loadLesson,
  choosePlacement,
  reservePlacement,
  completePlacement,
  loadTask,
  loadTaskContext,
  answerNoticing,
} from '@/lib/db/curriculum';
it('grades trusted noticing without publishing answers or allowing locked lesson access', async () => {
  const learner = '00000000-0000-4000-8000-000000000013';
  await database.query('INSERT INTO auth.users VALUES ($1)', [learner]);
  await reservePlacement(learner);
  await completePlacement(learner, {
    cefr: 'A1',
    confidence: 0.8,
    reason: 'Synthetic.',
    safety_flag: false,
  });
  await choosePlacement(learner, 'A1');
  const unit = structuredClone(curriculumDraft[0]);
  const lesson = unit.lessons[0];
  lesson.noticing = {
    instruction: 'Find two words.',
    spans: [
      { start: 0, end: 1 },
      { start: 2, end: 4 },
    ],
    explanation: 'A reviewed explanation.',
  };
  await database.query('UPDATE writing.curriculum_units SET content=$1 WHERE id=$2', [
    JSON.stringify(unit),
    unit.id,
  ]);
  try {
    const loaded = await loadLesson(learner, lesson.id);
    expect(loaded.noticing).toEqual({ instruction: 'Find two words.' });
    expect(await answerNoticing(learner, lesson.id, [{ start: 0, end: 1 }])).toEqual({
      correct: false,
    });
    expect(await answerNoticing(learner, lesson.id, lesson.noticing.spans)).toEqual({
      correct: true,
      explanation: 'A reviewed explanation.',
    });
    await expect(answerNoticing(bob, lesson.id, lesson.noticing.spans)).rejects.toMatchObject({
      code: 'LESSON_LOCKED',
    });
  } finally {
    await database.query('UPDATE writing.curriculum_units SET content=$1 WHERE id=$2', [
      JSON.stringify(curriculumDraft[0]),
      unit.id,
    ]);
  }
});
it('schedules reviewed transfer locally, strips answers and isolates owners and stale requests', async () => {
  const learner = '00000000-0000-4000-8000-000000000014';
  await database.query('INSERT INTO auth.users VALUES ($1)', [learner]);
  await reservePlacement(learner);
  await completePlacement(learner, {
    cefr: 'A1',
    confidence: 0.8,
    reason: 'Synthetic.',
    safety_flag: false,
  });
  await choosePlacement(learner, 'A1');
  const unit = structuredClone(curriculumDraft[0]);
  unit.transferDrills = [
    {
      id: 'synthetic-transfer',
      tag: 'articles',
      prompt: 'Complete: I have ___ apple.',
      answers: ['an'],
      explanation: 'Use an before this vowel sound.',
    },
  ];
  await database.query('UPDATE writing.curriculum_units SET content=$1 WHERE id=$2', [
    JSON.stringify(unit),
    unit.id,
  ]);
  try {
    const path = await loadPath(learner);
    expect(path.units[0]).not.toHaveProperty('transferDrills');
    const loaded = await loadTransfer(learner);
    expect(loaded.questions).toContainEqual({
      id: 'synthetic-transfer',
      unitId: unit.id,
      tag: 'articles',
      prompt: 'Complete: I have ___ apple.',
      version: 0,
    });
    expect(await answerTransfer(learner, unit.id, 'synthetic-transfer', 'a', 0)).toMatchObject({
      correct: false,
      complete: false,
      version: 1,
    });
    expect(await answerTransfer(learner, unit.id, 'synthetic-transfer', 'a', 0)).toMatchObject({
      version: 1,
    });
    await expect(
      answerTransfer(learner, unit.id, 'synthetic-transfer', 'an', 0),
    ).rejects.toMatchObject({ code: 'PRACTICE_CONFLICT' });
    expect(await answerTransfer(learner, unit.id, 'synthetic-transfer', 'an', 1)).toMatchObject({
      correct: true,
      complete: true,
      days: 1,
      version: 2,
    });
    expect((await loadTransfer(learner)).questions).toEqual([]);
    await expect(answerTransfer(bob, unit.id, 'synthetic-transfer', 'an', 0)).rejects.toMatchObject(
      { code: 'NOT_FOUND' },
    );
    const otherRows = await drizzle(database).transaction(async (transaction) => {
      await transaction.execute(sql`SELECT set_config('request.jwt.claim.sub', ${bob}, true)`);
      await transaction.execute(sql`SET LOCAL ROLE authenticated`);
      return transaction.execute(sql`SELECT * FROM writing.transfer_progress`);
    });
    expect(otherRows.rows).toHaveLength(0);
  } finally {
    await database.query('UPDATE writing.curriculum_units SET content=$1 WHERE id=$2', [
      JSON.stringify(curriculumDraft[0]),
      unit.id,
    ]);
  }
});
it('serves reviewed parallel prompts at the checkpoint without changing its identity or publishing other answer keys', async () => {
  const learner = '00000000-0000-4000-8000-000000000015';
  await database.query('INSERT INTO auth.users VALUES ($1)', [learner]);
  await reservePlacement(learner);
  await completePlacement(learner, {
    cefr: 'A1',
    confidence: 0.8,
    reason: 'Synthetic.',
    safety_flag: false,
  });
  await choosePlacement(learner, 'A1');
  const unit = structuredClone(curriculumDraft[0]);
  unit.parallelPrompt = {
    ...unit.lessons[0].task,
    id: unit.lessons.at(-1)!.task.id,
    isCheckpoint: true,
    prompt: 'Write a fresh parallel message.',
  };
  await database.query('UPDATE writing.curriculum_units SET content=$1 WHERE id=$2', [
    JSON.stringify(unit),
    unit.id,
  ]);
  try {
    const path = await loadPath(learner);
    expect(path.units[0].lessons.at(-1)!.task.prompt).toBe('Write a fresh parallel message.');
    expect(path.units[0]).not.toHaveProperty('parallelPrompt');
  } finally {
    await database.query('UPDATE writing.curriculum_units SET content=$1 WHERE id=$2', [
      JSON.stringify(curriculumDraft[0]),
      unit.id,
    ]);
  }
});
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
  await database.exec(await readFile('drizzle/0012_mastery_advisory.sql', 'utf8'));
  await database.exec(await readFile('drizzle/0014_benchmark_context.sql', 'utf8'));
  await database.exec(await readFile('drizzle/0013_transfer_practice.sql', 'utf8'));
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
  expect(await loadTaskContext(alice, first.task.id)).toEqual({
    task: first.task,
    targets: ['subject-verb-agreement', 'articles'],
  });
  expect(await loadTask(alice, first.task.id)).toEqual(first.task);
  expect((await loadTaskContext(alice, 'weekend')).targets).toEqual([]);
  await expect(loadTaskContext(bob, first.task.id)).rejects.toThrow('LESSON_LOCKED');
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
