import { afterEach, expect, it, vi } from 'vitest';
import { POST } from '@/app/auth/google/route';

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
  vi.unstubAllEnvs();
});
function configureGoogle() {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://auth.example');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-public-key');
  vi.stubEnv('GOOGLE_AUTH_ENABLED', 'true');
}
function request(origin: string | null) {
  return new Request('http://localhost:3000/auth/google', {
    method: 'POST',
    headers: { host: '127.0.0.1:3000', ...(origin ? { origin } : {}) },
  });
}
it('redirects a same-origin form to Google with a browser-bound PKCE verifier', async () => {
  configureGoogle();
  const response = await POST(request('http://127.0.0.1:3000'));
  expect(response.status).toBe(303);
  const destination = new URL(response.headers.get('location')!);
  expect(destination.origin).toBe('https://auth.example');
  expect(destination.pathname).toBe('/auth/v1/authorize');
  expect(destination.searchParams.get('provider')).toBe('google');
  expect(destination.searchParams.get('redirect_to')).toBe('http://127.0.0.1:3000/auth/callback');
  expect(destination.searchParams.get('code_challenge')).toBeTruthy();
  expect([...cookieValues.keys()].some((name) => name.includes('code-verifier'))).toBe(true);
});
it.each([null, 'https://foreign.example', 'https://127.0.0.1:3000', 'invalid-origin'])(
  'rejects untrusted form origin %s',
  async (origin) => {
    configureGoogle();
    const response = await POST(request(origin));
    expect(response.status).toBe(403);
    expect(cookieValues.size).toBe(0);
  },
);
it('returns to sign-in when Google is disabled', async () => {
  configureGoogle();
  vi.stubEnv('GOOGLE_AUTH_ENABLED', 'false');
  const response = await POST(request('http://127.0.0.1:3000'));
  expect(response.status).toBe(303);
  expect(response.headers.get('location')).toBe('http://127.0.0.1:3000/login?error=callback');
  expect(cookieValues.size).toBe(0);
});
