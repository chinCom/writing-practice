import { expect, test } from '@playwright/test';

const message =
  'Hi Maria! Last weekend I went to the beach with my family. The weather was warm and we swam in the sea. I ate ice cream and my brother lost his hat. Would you like to come to the beach with us next weekend?';

test('word bank restores the cursor after inserting a phrase', async ({ page }) => {
  await page.goto('/dev/preview/live-write');
  const writing = page.getByRole('textbox', { name: 'Your writing' });
  await writing.fill('Hi Maria!');
  await writing.evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(3, 3));
  await page.getByRole('button', { name: 'Last weekend', exact: true }).click();
  await expect(writing).toHaveValue('Hi Last weekendMaria!');
  await expect
    .poll(() => writing.evaluate((element: HTMLTextAreaElement) => element.selectionStart))
    .toBe(15);
  await expect(writing).toBeFocused();
});

test('checking freezes word-bank editing and prevents duplicate requests', async ({ page }) => {
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/feedback', async (route) => {
    await pending;
    await route.fulfill({ status: 500, json: { ok: false } });
  });
  await page.goto('/dev/preview/live-write');
  const writing = page.getByRole('textbox', { name: 'Your writing' });
  await writing.fill(message);
  await page.getByRole('button', { name: 'Check my writing' }).click();
  await expect(page.getByText('The coach is reading your writing…')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Last weekend', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Check my writing' })).toBeDisabled();
  await expect(writing).toBeDisabled();
  release();
  await expect(writing).toBeEnabled();
  await expect(writing).toHaveValue(message);
});

test('a lost coach response opens saved feedback without a duplicate check', async ({ page }) => {
  let paidRequests = 0;
  await page.route('**/api/feedback', async (route) => {
    paidRequests++;
    expect(route.request().headers()['idempotency-key']).toMatch(/^[a-f0-9-]{36}$/);
    await route.abort('failed');
  });
  await page.route('**/api/feedback?requestKey=*', (route) =>
    route.fulfill({
      json: {
        ok: true,
        data: { status: 'completed', submissionId: 'recovered' },
      },
    }),
  );
  await page.goto('/dev/preview/live-write');
  await page.getByRole('textbox', { name: 'Your writing' }).fill(message);
  await page.getByRole('button', { name: 'Check my writing' }).click();
  await expect(page.getByRole('heading', { name: 'Your marked page', exact: true })).toBeVisible();
  expect(paidRequests).toBe(1);
});
test('reload recovers an existing check without sending the writing again', async ({ page }) => {
  let paidRequests = 0;
  await page.route('**/api/feedback', () => {
    paidRequests++;
  });
  await page.route('**/api/feedback?requestKey=*', (route) =>
    route.fulfill({
      json: {
        ok: true,
        data: { status: 'completed', submissionId: 'saved-before-reload' },
      },
    }),
  );
  await page.goto('/dev/preview/live-write');
  // Wait for hydration before seeding the reload fixture. The initial mount must finish first.
  await page.getByRole('checkbox', { name: 'Say where you went' }).check();
  await expect(page.getByRole('checkbox', { name: 'Say where you went' })).toBeChecked();
  await page.evaluate(() =>
    sessionStorage.setItem(
      'coach-check:/dev/preview/live-write',
      '00000000-0000-4000-8000-000000000015',
    ),
  );
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your marked page', exact: true })).toBeVisible();
  expect(paidRequests).toBe(0);
});
test('a pending check offers saved-result recovery and preserves the writing', async ({ page }) => {
  let completed = false;
  let paidRequests = 0;
  await page.route('**/api/feedback', (route) => {
    paidRequests++;
    return route.fulfill({ status: 202, json: { ok: true, data: { status: 'pending' } } });
  });
  await page.route('**/api/feedback?requestKey=*', (route) =>
    route.fulfill({
      json: {
        ok: true,
        data: completed ? { status: 'completed', submissionId: 'later' } : { status: 'pending' },
      },
    }),
  );
  await page.goto('/dev/preview/live-write');
  const writing = page.getByRole('textbox', { name: 'Your writing' });
  await writing.fill(message);
  await page.getByRole('button', { name: 'Check my writing' }).click();
  const recovery = page.getByRole('button', { name: 'Look for my feedback', exact: true });
  await expect(recovery).toBeVisible({ timeout: 20000 });
  await expect(writing).toHaveValue(message);
  await expect(writing).toBeEnabled();
  completed = true;
  await recovery.click();
  await expect(page.getByRole('heading', { name: 'Your marked page', exact: true })).toBeVisible();
  expect(paidRequests).toBe(1);
});
test('coach failure preserves writing and provides a clear retry action', async ({ page }) => {
  await page.route('**/api/feedback', (route) =>
    route.fulfill({
      status: 502,
      json: {
        ok: false,
        error: { code: 'COACH_TIMEOUT' },
      },
    }),
  );
  await page.goto('/dev/preview/live-write');
  const writing = page.getByRole('textbox', { name: 'Your writing' });
  await writing.fill(message);
  await page.getByRole('button', { name: 'Check my writing' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'The coach took too long' }),
  ).toBeVisible();
  await expect(writing).toBeEnabled();
  await expect(writing).toHaveValue(message);
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
});
test('reload warns before discarding unsaved writing', async ({ page }) => {
  await page.goto('/dev/preview/live-write');
  const writing = page.getByRole('textbox', { name: 'Your writing' });
  await writing.fill(message);
  const dialogOpened = page.waitForEvent('dialog');
  await page.evaluate(() => setTimeout(() => window.location.reload(), 0));
  const dialog = await dialogOpened;
  expect(dialog.type()).toBe('beforeunload');
  await dialog.dismiss();
  await expect(writing).toHaveValue(message);
});

test('Vietnamese feedback keeps the English writing left-to-right without overflowing', async ({
  page,
  context,
}) => {
  await context.addCookies([{ name: 'locale', value: 'vi', url: 'http://127.0.0.1:3000' }]);
  await page.goto('/dev/preview/feedback');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('[dir="ltr"]').first()).toContainText('Hi Maria!');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
