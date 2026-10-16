import { expect, it, vi } from 'vitest';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { withUserDatabase } from '@/lib/db/client';

const state = vi.hoisted(() => ({ failed: false, ended: vi.fn(async () => undefined) }));
vi.mock('server-only', () => ({}));
vi.mock('postgres', () => ({ default: vi.fn(() => ({ end: state.ended })) }));
vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: () => ({
    transaction: async (work: (transaction: { execute: () => Promise<unknown[]> }) => unknown) => {
      if (!state.failed) {
        state.failed = true;
        throw new Error('Failed query', {
          cause: Object.assign(new Error('Socket closed'), { code: 'CONNECTION_CLOSED' }),
        });
      }
      return work({ execute: async () => [{ recovered: true }] });
    },
  }),
}));

it('discards a disconnected slot before serving the next database operation', async () => {
  vi.stubEnv('DATABASE_URL', 'synthetic-transport');
  try {
    await expect(
      withUserDatabase('synthetic-owner', (transaction) => transaction.execute(sql`SELECT 1`)),
    ).rejects.toMatchObject({ cause: { code: 'CONNECTION_CLOSED' } });
    expect(
      await withUserDatabase('synthetic-owner', (transaction) =>
        transaction.execute(sql`SELECT 1`),
      ),
    ).toEqual([{ recovered: true }]);
    expect(postgres).toHaveBeenCalledTimes(2);
    expect(state.ended).toHaveBeenCalledExactlyOnceWith({ timeout: 0 });
  } finally {
    vi.unstubAllEnvs();
  }
});
