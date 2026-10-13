import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { authClient } from '@/lib/auth/server';
import { GET as callback } from '@/app/auth/callback/route';
import { proxy } from '@/proxy';

vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn() }));
vi.mock('@/lib/auth/config', () => ({ authConfigured: () => true }));
vi.mock('@/lib/auth/server', () => ({ authClient: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
});

it('exchanges a PKCE code and redirects only to the local Today page', async () => {
  const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
  vi.mocked(authClient).mockResolvedValue({
    auth: { exchangeCodeForSession },
  } as unknown as NonNullable<Awaited<ReturnType<typeof authClient>>>);
  const response = await callback(
    new Request('https://writing.example/auth/callback?code=single-use&next=https://evil.example'),
  );
  expect(exchangeCodeForSession).toHaveBeenCalledWith('single-use');
  expect(response.headers.get('location')).toBe('https://writing.example/today');
});

it('returns to Login when the callback code is missing or rejected', async () => {
  const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: { message: 'Invalid code' } });
  vi.mocked(authClient).mockResolvedValue({
    auth: { exchangeCodeForSession },
  } as unknown as NonNullable<Awaited<ReturnType<typeof authClient>>>);
  for (const query of ['', '?code=expired']) {
    const response = await callback(new Request('https://writing.example/auth/callback' + query));
    expect(response.headers.get('location')).toBe('https://writing.example/login?error=callback');
  }
  expect(exchangeCodeForSession).toHaveBeenCalledTimes(1);
});

it('forwards rotated session cookies to the request and browser without caching the response', async () => {
  vi.mocked(createServerClient).mockImplementation((_url, _key, options) => {
    return {
      auth: {
        getUser: async () => {
          if (options && 'cookies' in options && 'setAll' in options.cookies) {
            await options.cookies.setAll?.(
              [{ name: 'sb-session', value: 'rotated', options: { path: '/', httpOnly: true } }],
              {
                'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
                Expires: '0',
                Pragma: 'no-cache',
              },
            );
          }
          return { data: { user: { id: 'learner' } }, error: null };
        },
      },
    } as unknown as ReturnType<typeof createServerClient>;
  });
  const request = new NextRequest('https://writing.example/today');
  const response = await proxy(request);
  expect(request.cookies.get('sb-session')?.value).toBe('rotated');
  expect(response.cookies.get('sb-session')?.value).toBe('rotated');
  expect(response.headers.get('Cache-Control')).toContain('no-store');
  expect(response.headers.get('Expires')).toBe('0');
  expect(response.headers.get('Pragma')).toBe('no-cache');
});
