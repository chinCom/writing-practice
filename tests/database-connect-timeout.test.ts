import { createServer } from 'node:net';
import type { Socket } from 'node:net';
import { sql } from 'drizzle-orm';
import { expect, it, vi } from 'vitest';
import { withUserDatabase } from '@/lib/db/client';

vi.mock('server-only', () => ({}));

it('stops waiting when a database accepts TCP but never completes its handshake', async () => {
  const sockets = new Set<Socket>();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on('error', () => undefined);
    socket.on('close', () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing local test listener.');
  vi.stubEnv('DATABASE_URL', `postgres://test:test@127.0.0.1:${address.port}/test`);
  try {
    // A missing connect deadline leaves this pending beyond the test's eight-second limit.
    await expect(
      withUserDatabase('00000000-0000-4000-8000-000000000001', (transaction) =>
        transaction.execute(sql`SELECT 1`),
      ),
    ).rejects.toMatchObject({ code: 'CONNECT_TIMEOUT' });
  } finally {
    vi.unstubAllEnvs();
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}, 8000);
