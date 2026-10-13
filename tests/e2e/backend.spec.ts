import { expect, test } from '@playwright/test';

test('Today uses desktop space and links to the real writing task', async ({ page }, testInfo) => {
  await page.goto('/today');
  await expect(page.getByRole('link', { name: 'Start writing', exact: true })).toHaveAttribute(
    'href',
    '/write/weekend',
  );
  if (testInfo.project.name === 'desktop') {
    const width = await page
      .getByTestId('today-layout')
      .evaluate((element) => element.getBoundingClientRect().width);
    expect(width).toBeGreaterThan(1000);
  }
});
test('unconfigured sign-in is honest and learner APIs fail closed', async ({ page, request }) => {
  await page.goto('/write/weekend');
  await expect(page.getByRole('heading', { name: 'Sign in to save your writing' })).toBeVisible();
  await expect(page.getByText('Supabase is not configured yet.')).toBeVisible();
  const response = await request.post('/api/feedback', {
    data: { taskId: 'weekend', text: 'Private text', attempt: 1 },
  });
  expect(response.status()).toBe(503);
  expect(await response.json()).toMatchObject({ ok: false, error: { code: 'NOT_CONFIGURED' } });
  expect((await request.put('/api/draft', { data: { text: 'Draft' } })).status()).toBe(503);
});
test('synthetic editor flow submits writing and opens a marked feedback page', async ({ page }) => {
  await page.route('**/api/draft', async (route) => {
    expect(route.request().method()).toBe('PUT');
    await route.fulfill({ json: { ok: true } });
  });
  await page.route('**/api/feedback', async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({ taskId: 'weekend', attempt: 1 });
    await route.fulfill({ json: { ok: true, data: { submissionId: 'preview' } } });
  });
  await page.goto('/dev/preview/live-write');
  await page
    .getByRole('textbox', { name: 'Your writing' })
    .fill(
      'Hi Maria! Last weekend I go to the beach with my family. The weather was very good and we swimmed in the sea. I eat a big ice cream and my brother he lost his hat. In the evening we returned home tired but happy. I want to go again next weekend, if you can come with us?',
    );
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByText('Draft saved to your account')).toBeVisible();
  await page.getByRole('button', { name: 'Check my writing', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your marked page', exact: true })).toBeVisible();
  await expect(page.getByText('Mock feedback · No AI service was called.')).toBeVisible();
  await expect(page.locator('mark').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('auth callback refuses external redirects', async ({ request }) => {
  const response = await request.get('/auth/callback?next=https://evil.example', {
    maxRedirects: 0,
  });
  expect(response.headers().location).toContain('/login');
  expect(response.headers().location).not.toContain('evil.example');
});
