import { expect, test } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { serviceURL, accessToken } from '../journey/fixture';

test.beforeEach(async ({ context }) => {
  const cookies = new Map<string, string>();
  const auth = createServerClient(serviceURL, 'journey-public-key', {
    cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: (values) => values.forEach(({ name, value }) => cookies.set(name, value)),
    },
  });
  const { error } = await auth.auth.setSession({
    access_token: accessToken,
    refresh_token: 'journey-refresh',
  });
  expect(error).toBeNull();
  await context.addCookies(
    [...cookies].map(([name, value]) => ({ name, value, domain: '127.0.0.1', path: '/' })),
  );
});

test('Progress completes its server data stream before hydration without an API round trip', async ({
  page,
}) => {
  let releaseHydration = () => {};
  const hydration = new Promise<void>((resolve) => {
    releaseHydration = resolve;
  });
  await page.route('**/_next/static/chunks/*.js', async (route) => {
    await hydration;
    await route.continue();
  });
  const progressRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/progress')) progressRequests.push(request.url());
  });
  const response = await page.goto('/progress', { waitUntil: 'commit' });
  const visibleSkeleton = page.locator('[data-ui="progress-panels-skeleton"]:visible');
  await expect(visibleSkeleton).toHaveCount(1);
  expect(await response!.finished()).toBeNull();
  await expect(visibleSkeleton).toHaveCount(1);
  releaseHydration();
  await expect(
    page.getByRole('heading', { name: 'Your review insights', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: 'Your course', exact: true })).toBeVisible();
  await expect(page.locator('[data-ui="progress-panels-skeleton"]')).toHaveCount(0);
  expect(progressRequests).toEqual([]);
});

test('private navigation prefetch starts on user intent and vitals stay anonymous', async ({
  page,
  isMobile,
}) => {
  const prefetches: string[] = [];
  const vitals: Record<string, unknown>[] = [];
  page.on('request', (request) => {
    if (request.headers()['next-router-prefetch']) prefetches.push(new URL(request.url()).pathname);
    if (request.url().endsWith('/api/telemetry')) vitals.push(request.postDataJSON());
  });
  await page.goto('/progress');
  // Wait for a real client-side metric to prove hydration has finished.
  await expect.poll(() => vitals.length).toBeGreaterThan(0);
  expect(
    prefetches.filter((path) => ['/path', '/practice', '/portfolio', '/settings'].includes(path)),
  ).toEqual([]);
  if (!isMobile) {
    const navigation = page.getByRole('navigation', { name: 'Main navigation' });
    await navigation.getByRole('link', { name: 'Portfolio', exact: true }).focus();
    await expect.poll(() => prefetches.includes('/portfolio')).toBe(true);
  }
  expect(vitals[0]).toMatchObject({ route: '/progress' });
  expect(Object.keys(vitals[0]).toSorted()).toEqual([
    'device',
    'id',
    'name',
    'navigationType',
    'route',
    'value',
  ]);
});
