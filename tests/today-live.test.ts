import { randomUUID } from 'node:crypto';
import { expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { loadPractice } from '@/lib/db/practice';
import { loadToday } from '@/lib/db/today';

vi.mock('server-only', () => ({}));

it.runIf(process.env.RUN_DATABASE_DEADLINES === 'true')(
  'loads Today and Practice while another transaction holds the learner write lock',
  async () => {
    const userId = randomUUID();
    const observer = postgres(process.env.DATABASE_URL!, {
      prepare: false,
      max: 1,
      connect_timeout: 5,
    });
    try {
      await observer.begin(async (blocker) => {
        await blocker`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`;
        const today = await loadToday(userId);
        expect(today.submissions).toEqual([]);
        expect(today.progress.sessions).toBe(0);
        expect(today.practice.questions).toEqual([]);
        expect(today.preferences.weeklyGoal).toBe(5);
        expect((await loadPractice(userId)).questions).toEqual([]);
      });
      expect((await loadToday(userId)).practice.questions).toEqual([]);
    } finally {
      await observer.end({ timeout: 2 });
    }
  },
  20000,
);

// Uses the configured database with a synthetic owner. Creates no learner rows or AI calls.
it.runIf(process.env.RUN_DATABASE_DEADLINES === 'true')(
  'loads all Today sections through the hosted pool without self-induced queue saturation',
  async () => {
    const start = Date.now();
    const today = await loadToday(randomUUID());
    expect(today.submissions).toEqual([]);
    expect(today.progress.sessions).toBe(0);
    expect(today.practice.questions).toEqual([]);
    expect(today.preferences.weeklyGoal).toBe(5);
    expect(today.learningPath.chosenLevel).toBeNull();
    console.info(`Hosted Today data loaded in ${Date.now() - start} ms.`);
  },
  15000,
);
