import { createServer, connect } from 'node:net';
import type { Socket } from 'node:net';
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { expect, it, vi } from 'vitest';
import { withUserDatabase } from '@/lib/db/client';

vi.mock('server-only', () => ({}));

it.runIf(process.env.RUN_DATABASE_DEADLINES === 'true')(
  'bounds queue waits and destroys only the operation connection after established traffic stops',
  async () => {
    const upstream = new URL(process.env.DATABASE_URL!);
    const sockets = new Set<Socket>();
    let lastClient: Socket | undefined;
    let blockedClient: Socket | undefined;
    const relay = createServer((client) => {
      const remote = connect(Number(upstream.port || 5432), upstream.hostname);
      for (const socket of [client, remote]) {
        sockets.add(socket);
        socket.on('error', () => undefined);
        socket.on('close', () => sockets.delete(socket));
      }
      client.on('data', (chunk) => {
        if (client !== blockedClient) remote.write(chunk);
      });
      remote.on('data', (chunk) => {
        if (client !== blockedClient) {
          lastClient = client;
          client.write(chunk);
        }
      });
      client.on('close', () => remote.destroy());
      remote.on('close', () => {
        if (client !== blockedClient) client.destroy();
      });
    });
    await new Promise<void>((resolve) => relay.listen(0, '127.0.0.1', resolve));
    const address = relay.address();
    if (!address || typeof address === 'string') throw new Error('Missing test relay.');
    const local = new URL(upstream);
    local.hostname = '127.0.0.1';
    local.port = String(address.port);
    vi.stubEnv('DATABASE_URL', local.toString());
    const owner = randomUUID();
    try {
      const sleeping = Array.from({ length: 3 }, () =>
        withUserDatabase(owner, (transaction) => transaction.execute(sql`SELECT pg_sleep(4)`)),
      );
      const settled = Promise.allSettled(sleeping);
      const queuedStarted = Date.now();
      await expect(
        withUserDatabase(owner, (transaction) => transaction.execute(sql`SELECT 1`)),
      ).rejects.toMatchObject({ code: 'DATABASE_TIMEOUT' });
      expect(Date.now() - queuedStarted).toBeLessThan(3500);
      expect((await settled).every((result) => result.status === 'fulfilled')).toBe(true);

      const healthy = withUserDatabase(owner, async (transaction) => {
        await transaction.execute(sql`SELECT pg_sleep(1)`);
        return transaction.execute(sql`SELECT auth.uid() AS owner`);
      });
      const started = Date.now();
      const stalled = withUserDatabase(owner, async (transaction) => {
        blockedClient = lastClient;
        return transaction.execute(sql`SELECT 1`);
      });
      const healthyResult = await healthy;
      expect(healthyResult[0]).toMatchObject({ owner });
      await expect(stalled).rejects.toMatchObject({ code: 'DATABASE_TIMEOUT' });
      expect(Date.now() - started).toBeLessThan(12000);
      blockedClient = undefined;
      const resumed = await withUserDatabase(owner, (transaction) =>
        transaction.execute(sql`SELECT auth.uid() AS owner`),
      );
      expect(resumed[0]).toMatchObject({ owner });
    } finally {
      vi.unstubAllEnvs();
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve) => relay.close(() => resolve()));
    }
  },
  30000,
);
