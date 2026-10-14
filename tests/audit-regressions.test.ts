import { expect, it, vi } from 'vitest';
import { signOut } from '@/app/login/actions';
import { authClient } from '@/lib/auth/server';
import { practiceRetryHint } from '@/lib/practice';
vi.mock('@/lib/auth/server', () => ({ authClient: vi.fn() }));
it('does not infer a verb-form rule from an adverb spelling mistake', () => {
  // The hint must report the exact mismatch, not claim that reely is a verb.
  expect(practiceRetryHint('I could reely choose', 'I could really choose')).toEqual({
    kind: 'phrase',
    phrase: 'reely',
  });
});
it('reports sign-out rejection and transport failure without claiming success', async () => {
  const signOutCall = vi.fn().mockResolvedValue({ error: { message: 'unavailable' } });
  vi.mocked(authClient).mockResolvedValue({
    auth: { signOut: signOutCall },
  } as unknown as NonNullable<Awaited<ReturnType<typeof authClient>>>);
  expect(await signOut()).toEqual({ ok: false });
  signOutCall.mockRejectedValueOnce(new Error('offline'));
  expect(await signOut()).toEqual({ ok: false });
  signOutCall.mockResolvedValue({ error: null });
  expect(await signOut()).toEqual({ ok: true });
});
