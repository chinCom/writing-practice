import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import { registerHooks } from 'node:module';
import { createElement } from 'react';
// Exercise React's real request cache through the renderer shipped with Next.js.
// @ts-expect-error Next.js does not publish declarations for its bundled RSC renderer.
import { renderToReadableStream } from 'next/dist/compiled/react-server-dom-turbopack/server.node.js';

const sessions = new AsyncLocalStorage<string>();
type CookieStore = {
  getAll: () => { name: string; value: string | undefined }[];
  set: () => void;
};
const fixture = {
  calls: 0,
  cookies: () => ({
    getAll: () => [{ name: 'session', value: sessions.getStore() }],
    set: () => {},
  }),
  createServerClient: (_url: string, _key: string, options: { cookies: CookieStore }) => ({
    auth: {
      getUser: async () => {
        fixture.calls++;
        const id = options.cookies.getAll()[0].value;
        await Promise.resolve();
        return {
          data: { user: { id } },
          error: id === 'expired' ? new Error('Session expired') : null,
        };
      },
    },
  }),
};

Object.assign(globalThis, { authRenderFixture: fixture });
const mocks: Record<string, string> = {
  '@supabase/ssr':
    'export const createServerClient = globalThis.authRenderFixture.createServerClient;',
  'next/headers': 'export const cookies = async () => globalThis.authRenderFixture.cookies();',
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (mocks[specifier]) {
      return {
        url: 'data:text/javascript,' + encodeURIComponent(mocks[specifier]),
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://auth.test';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-public-key';
const { currentUser } = await import('../../src/lib/auth/server');

async function UserProbe() {
  const [first, second] = await Promise.all([currentUser(), currentUser()]);
  return `${first?.id ?? 'anonymous'}/${second?.id ?? 'anonymous'}`;
}

async function renderSession(id: string) {
  return sessions.run(id, async () => {
    const stream = await renderToReadableStream([
      createElement(UserProbe, { key: 'layout' }),
      createElement(UserProbe, { key: 'page' }),
    ]);
    return new Response(stream).text();
  });
}

const [alice, bob] = await Promise.all([renderSession('alice'), renderSession('bob')]);
assert.equal(fixture.calls, 2, 'Four callers per render must validate once per request');
assert.match(alice, /alice\/alice/);
assert.doesNotMatch(alice, /bob\/bob/);
assert.match(bob, /bob\/bob/);
assert.doesNotMatch(bob, /alice\/alice/);

const expired = await renderSession('expired');
assert.match(expired, /anonymous\/anonymous/);
assert.equal(fixture.calls, 3, 'A later request must validate again');

delete process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.match(await renderSession('unconfigured'), /anonymous\/anonymous/);
assert.equal(fixture.calls, 3);
console.log('Request deduplication, concurrent session isolation, and expired sessions verified.');
