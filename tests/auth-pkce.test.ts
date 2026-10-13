import { createHash } from 'node:crypto';
import { afterEach, expect, it, vi } from 'vitest';
import { authClient } from '@/lib/auth/server';
import { GET as callback } from '@/app/auth/callback/route';

const cookieValues = vi.hoisted(() => new Map<string, string>());
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => [...cookieValues].map(([name, value]) => ({ name, value })),
    set: (name: string, value: string) => cookieValues.set(name, value),
  }),
}));

afterEach(() => {
  cookieValues.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it('completes the SDK PKCE exchange with the requesting browser verifier and rejects a different browser', async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://auth.example');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-public-key');
  let challenge = '';
  let exchanged = false;
  vi.stubGlobal('fetch', async (url: string, options: RequestInit) => {
    const body = JSON.parse(String(options.body));
    if (new URL(url).pathname.endsWith('/otp')) {
      challenge = body.code_challenge;
      expect(body.code_challenge_method).toBe('s256');
      expect(body.gotrue_meta_security).toBeDefined();
      return Response.json({});
    }
    expect(url).toContain('/token?grant_type=pkce');
    const verifierHash = createHash('sha256').update(body.code_verifier).digest('base64url');
    expect(verifierHash).toBe(challenge);
    expect(body.auth_code).toBe('synthetic-single-use-code');
    exchanged = true;
    const claims = Buffer.from(
      JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    ).toString('base64url');
    return Response.json({
      access_token: `header.${claims}.signature`,
      refresh_token: 'synthetic-refresh-token',
      expires_in: 3600,
      token_type: 'bearer',
      user: { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated' },
    });
  });
  const client = await authClient();
  expect(client).not.toBeNull();
  const { error } = await client!.auth.signInWithOtp({
    email: 'synthetic@example.com',
    options: { emailRedirectTo: 'https://writing.example/auth/callback' },
  });
  expect(error).toBeNull();
  expect(challenge).not.toBe('');
  expect([...cookieValues.keys()].some((name) => name.includes('code-verifier'))).toBe(true);
  const requesterCookies = new Map(cookieValues);
  cookieValues.clear();
  const differentBrowser = await callback(
    new Request('https://writing.example/auth/callback?code=synthetic-single-use-code'),
  );
  expect(differentBrowser.headers.get('location')).toBe(
    'https://writing.example/login?error=callback',
  );
  expect(exchanged).toBe(false);
  for (const [name, value] of requesterCookies) cookieValues.set(name, value);
  const requester = await callback(
    new Request('https://writing.example/auth/callback?code=synthetic-single-use-code'),
  );
  expect(requester.headers.get('location')).toBe('https://writing.example/today');
  expect(exchanged).toBe(true);
  expect(
    [...cookieValues].some(([name, value]) => name.endsWith('-auth-token') && value.length > 0),
  ).toBe(true);
});
