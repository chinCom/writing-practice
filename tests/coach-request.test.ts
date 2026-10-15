import { createServer } from 'node:http';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { requestCoach, recoverCoach } from '@/lib/feedback/request';

let mode:
  'success' | 'lost' | 'failed' | 'pending' | 'missing' | 'unauthorized' | 'database-timeout' =
  'success';
let transientLookups = 0;
let postCalls = 0;
let lastKey: string | undefined;
const server = createServer((request, response) => {
  if (mode === 'database-timeout' && (request.method === 'POST' || transientLookups++ === 0)) {
    if (request.method === 'POST') postCalls++;
    response.statusCode = 503;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ ok: false, error: { code: 'DATABASE_TIMEOUT' } }));
    return;
  }
  if (request.method === 'POST') {
    postCalls++;
    lastKey = request.headers['idempotency-key'] as string;
    if (mode === 'lost') return;
    response.setHeader('Content-Type', 'application/json');
    response.end(
      JSON.stringify({ ok: true, data: { submissionId: 'saved', status: 'completed' } }),
    );
    return;
  }
  response.setHeader('Content-Type', 'application/json');
  if (mode === 'missing' || mode === 'unauthorized') {
    response.statusCode = mode === 'missing' ? 404 : 401;
    response.end(JSON.stringify({ ok: false, error: { code: 'NOT_FOUND' } }));
    return;
  }
  response.end(
    JSON.stringify({
      ok: true,
      data: {
        submissionId: 'saved',
        status: mode === 'pending' ? 'pending' : mode === 'failed' ? 'failed' : 'completed',
      },
    }),
  );
});
beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing server');
  const originalFetch = fetch;
  vi.stubGlobal('fetch', (path: string, init: RequestInit) =>
    originalFetch('http://127.0.0.1:' + address.port + path, init),
  );
});
afterAll(async () => {
  vi.unstubAllGlobals();
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
const input = { taskId: 'weekend', text: 'Sample writing', attempt: 1 };
it('opens stored feedback after a lost response without repeating the paid request', async () => {
  mode = 'lost';
  postCalls = 0;
  expect(await requestCoach(input, 'test-key', { requestTimeoutMs: 100 })).toEqual({
    status: 'completed',
    submissionId: 'saved',
  });
  expect(postCalls).toBe(1);
  expect(lastKey).toBe('test-key');
});
it('returns a recoverable state instead of waiting forever for a pending check', async () => {
  mode = 'pending';
  expect(await recoverCoach('test-key', { recoveryTimeoutMs: 100, pollIntervalMs: 20 })).toEqual({
    status: 'pending',
  });
});
it('allows a new check when no reservation exists after the recovery deadline', async () => {
  mode = 'missing';
  expect(await recoverCoach('test-key', { recoveryTimeoutMs: 100, pollIntervalMs: 20 })).toEqual({
    status: 'failed',
    code: 'NOT_FOUND',
  });
});
it('asks for sign-in when the session expires during recovery', async () => {
  mode = 'unauthorized';
  expect(await recoverCoach('test-key')).toEqual({ status: 'failed', code: 'UNAUTHENTICATED' });
});
it('recovers saved feedback after database timeouts without starting another paid request', async () => {
  mode = 'database-timeout';
  transientLookups = 0;
  postCalls = 0;
  expect(
    await requestCoach(input, 'test-key', { recoveryTimeoutMs: 500, pollIntervalMs: 20 }),
  ).toEqual({
    status: 'completed',
    submissionId: 'saved',
  });
  expect(postCalls).toBe(1);
});
it('reports a failed stored check without starting another paid request', async () => {
  mode = 'failed';
  postCalls = 0;
  expect(await recoverCoach('test-key')).toEqual({ status: 'failed', code: 'COACH_FAILED' });
  expect(postCalls).toBe(0);
});
