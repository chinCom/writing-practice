import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { expect, it, vi } from 'vitest';
import { withUserDatabase } from '@/lib/db/client';

vi.mock('server-only', () => ({}));

// Real multi-connection PostgreSQL check. No rows, tables, emails, or AI calls are created.
it.runIf(process.env.RUN_DATABASE_DEADLINES === 'true')(
  'cancels blocked queries, rolls back locks, and serves queued work after pool saturation',
  async () => {
    const observer = postgres(process.env.DATABASE_URL!, {
      prepare: false,
      max: 1,
      connect_timeout: 5,
    });
    const userId = randomUUID();
    const lockKey = String(Date.now());
    try {
      // Removing application deadlines would let this finish successfully after seven seconds.
      const statementStarted = Date.now();
      const slow = await Promise.allSettled([
        withUserDatabase(userId, async (transaction) => {
          await transaction.execute(sql`SELECT pg_advisory_xact_lock(${lockKey}::bigint)`);
          await transaction.execute(sql`SELECT pg_sleep(7)`);
        }),
      ]);
      const statementElapsedMs = Date.now() - statementStarted;
      expect(slow[0].status).toBe('rejected');
      if (slow[0].status === 'rejected') {
        expect(slow[0].reason.cause?.code ?? slow[0].reason.code).toBe('57014');
      }
      const released = await observer`SELECT pg_try_advisory_lock(${lockKey}::bigint) AS acquired`;
      expect(released[0].acquired).toBe(true);
      await observer`SELECT pg_advisory_unlock(${lockKey}::bigint)`;

      let lockElapsedMs = 0;
      await observer.begin(async (blocker) => {
        await blocker`SELECT pg_advisory_xact_lock(${lockKey}::bigint)`;
        const started = Date.now();
        const waiting = await Promise.allSettled([
          withUserDatabase(userId, (transaction) =>
            transaction.execute(sql`SELECT pg_advisory_xact_lock(${lockKey}::bigint)`),
          ),
        ]);
        expect(waiting[0].status).toBe('rejected');
        if (waiting[0].status === 'rejected') {
          expect(waiting[0].reason.cause?.code ?? waiting[0].reason.code).toBe('55P03');
        }
        lockElapsedMs = Date.now() - started;
        expect(lockElapsedMs).toBeLessThan(4500);
      });

      const stalled = Array.from({ length: 3 }, () =>
        withUserDatabase(userId, (transaction) => transaction.execute(sql`SELECT pg_sleep(7)`)),
      );
      const settled = Promise.allSettled(stalled);
      await expect(
        withUserDatabase(userId, (transaction) => transaction.execute(sql`SELECT 1`)),
      ).rejects.toMatchObject({ code: 'DATABASE_TIMEOUT' });
      const results = await settled;
      expect(results.every((result) => result.status === 'rejected')).toBe(true);
      const resumed = await withUserDatabase(userId, (transaction) =>
        transaction.execute(sql`SELECT current_user AS role, auth.uid() AS owner`),
      );
      expect(resumed[0]).toMatchObject({ role: 'authenticated', owner: userId });
      await mkdir('docs/verification/hosted', { recursive: true });
      await writeFile(
        'docs/verification/hosted/database-deadlines.json',
        JSON.stringify(
          {
            statementCancelled: true,
            lockWaitCancelled: true,
            rollbackReleasedLocks: true,
            saturatedPoolResumedWork: true,
            authenticatedRoleAndOwnerRetained: true,
            statementElapsedMs,
            lockElapsedMs,
            timestamp: new Date().toISOString(),
            learnerDataCreated: false,
          },
          null,
          2,
        ) + '\n',
      );
    } finally {
      await observer.end({ timeout: 2 });
    }
  },
  25000,
);
