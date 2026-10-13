// Opt-in Auth-only check. Uses a disposable confirmed account; sends no email or AI requests.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServerClient } from '@supabase/ssr';
import { chromium } from '@playwright/test';

process.loadEnvFile('.env');
const email = process.env.TEST_LOGIN_EMAIL;
const passwordFile = process.env.TEST_LOGIN_PASSWORD_FILE;
assert(email && passwordFile, 'Set TEST_LOGIN_EMAIL and TEST_LOGIN_PASSWORD_FILE.');
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const cookies = new Map();
const auth = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    cookies: {
      getAll: () => [...cookies.values()],
      setAll: (values) => {
        for (const value of values) cookies.set(value.name, value);
      },
    },
  },
);
const { data, error } = await auth.auth.signInWithPassword({
  email,
  password: (await readFile(passwordFile, 'utf8')).trim(),
});
assert(!error && data.session, 'Disposable account authentication failed.');
const originalRefreshToken = data.session.refresh_token;
const browser = await chromium.launch();
const artifactPath = 'docs/verification/hosted';
await mkdir(artifactPath, { recursive: true });
try {
  const context = await browser.newContext();
  // Simulate cached-session expiry, not JWT expiry. The real hosted refresh endpoint must rotate it.
  const cookieName = [...cookies.keys()].find((name) => /-auth-token(?:\.0)?$/.test(name));
  assert(cookieName, 'Session cookie was not created.');
  const rootName = cookieName.replace(/\.0$/, '');
  const stored = [...cookies.values()]
    .filter(({ name }) => name === rootName || name.startsWith(rootName + '.'))
    .sort((left, right) => left.name.localeCompare(right.name, 'en', { numeric: true }))
    .map(({ value }) => value)
    .join('');
  assert(stored.startsWith('base64-'));
  const session = JSON.parse(Buffer.from(stored.slice(7), 'base64url').toString());
  session.expires_at = Math.floor(Date.now() / 1000) - 60;
  const expiredValue = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url');
  await context.addCookies([
    { name: rootName, value: expiredValue, url: baseURL, sameSite: 'Lax' },
  ]);
  const page = await context.newPage();
  const response = await page.goto(baseURL + '/write/weekend');
  await page.getByRole('textbox', { name: 'Your writing', exact: true }).waitFor();
  assert(page.url().endsWith('/write/weekend'), 'Refresh did not retain authenticated access.');
  assert(response.headers()['cache-control'].includes('no-store'));
  assert.equal(response.headers().pragma, 'no-cache');
  assert.equal(response.headers().expires, '0');
  const rotatedCookies = await context.cookies();
  const rotatedValue = rotatedCookies
    .filter(({ name }) => name === rootName || name.startsWith(rootName + '.'))
    .sort((left, right) => left.name.localeCompare(right.name, 'en', { numeric: true }))
    .map(({ value }) => value)
    .join('');
  const rotatedSession = JSON.parse(Buffer.from(rotatedValue.slice(7), 'base64url').toString());
  assert.notEqual(
    rotatedSession.refresh_token,
    originalRefreshToken,
    'Refresh token did not rotate.',
  );
  assert(rotatedSession.expires_at > Date.now() / 1000);
  await page.reload();
  await page.getByRole('textbox', { name: 'Your writing', exact: true }).waitFor();
  await auth.auth.setSession(rotatedSession);
  await auth.auth.signOut({ scope: 'global' });
  // A revoked refresh token must not grant access even if a stale session cookie remains.
  rotatedSession.expires_at = Math.floor(Date.now() / 1000) - 60;
  await context.clearCookies();
  await context.addCookies([
    {
      name: rootName,
      value: 'base64-' + Buffer.from(JSON.stringify(rotatedSession)).toString('base64url'),
      url: baseURL,
      sameSite: 'Lax',
    },
  ]);
  await page.goto(baseURL + '/write/weekend');
  assert(page.url().endsWith('/login'), 'Revoked session was not rejected.');
  const result = {
    hostedRefreshTokenRotation: true,
    refreshedCookiesSurviveReload: true,
    privateResponseHeaders: true,
    revokedRefreshTokenRejected: true,
    expiryMethod: 'Simulated cached expires_at; hosted access JWT was not allowed to expire',
    emailDeliveryTested: false,
    timestamp: new Date().toISOString(),
  };
  await writeFile(artifactPath + '/auth-refresh.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
  await context.close();
} finally {
  await browser.close();
  await auth.auth.signOut();
}
