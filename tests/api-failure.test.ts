import { expect, it, vi } from 'vitest';
import { apiFailure, ApiError } from '@/lib/api';
import { DomainError } from '@/lib/domain-error';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth/server', () => ({ currentUser: vi.fn() }));

it.each([
  ['NOT_FOUND', 404],
  ['LESSON_LOCKED', 403],
  ['WARMUPS_REQUIRED', 403],
  ['INVALID_INPUT', 400],
  ['PLACEMENT_PENDING', 409],
  ['PLACEMENT_LIMIT', 429],
  ['PLACEMENT_REQUIRED', 400],
  ['PRACTICE_CONFLICT', 409],
  ['ANSWER_HIDDEN', 403],
] as const)('maps domain reason %s only at the HTTP boundary', async (code, status) => {
  const error = new DomainError(code);
  expect(error).not.toHaveProperty('status');
  const response = apiFailure(error);
  expect(response.status).toBe(status);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(response.headers.has('retry-after')).toBe(false);
  expect(await response.json()).toEqual({ ok: false, error: { code, message: code } });
});

it.each(['57014', '55P03', '25P03', 'CONNECT_TIMEOUT', 'DATABASE_TIMEOUT'])(
  'returns a private retryable response for database deadline %s without exposing the query',
  async (code) => {
    const databaseError = Object.assign(new Error('Sensitive query or connection address'), {
      code,
    });
    const wrapped = new Error('Failed query: private writing', { cause: databaseError });
    const response = apiFailure(wrapped);
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('retry-after')).toBe('2');
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: 'DATABASE_TIMEOUT', message: 'Request could not be completed. Try again.' },
    });
  },
);

it('does not label other database errors as timeouts or expose their details', async () => {
  const response = apiFailure(Object.assign(new Error('Sensitive SQL'), { code: '42501' }));
  expect(response.status).toBe(500);
  expect(response.headers.has('retry-after')).toBe(false);
  expect(await response.json()).toEqual({
    ok: false,
    error: { code: 'SERVER_ERROR', message: 'Request could not be completed.' },
  });
  const known = apiFailure(new ApiError('UNAUTHENTICATED', 401));
  expect(known.status).toBe(401);
});
