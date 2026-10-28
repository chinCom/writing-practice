import { expect, test } from '@playwright/test';

const message =
  'Hi Maria! Last weekend I go to the beach with my family. The weather was very good and we swimmed in the sea. I eat a big ice cream and my brother he lost his hat. In the evening we returned home tired but happy. Would you like to come next time?';

async function openEditor(page: import('@playwright/test').Page) {
  await page.goto('/dev/preview/live-write');
  const writing = page.getByRole('textbox', { name: 'Your writing' });
  await writing.fill(message);
  return writing;
}

test('unconfigured Google sign-in is unavailable instead of sending users to a provider error', async ({
  page,
}) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeDisabled();
  await expect(
    page.getByText('Google sign-in is not available yet. Use an email link.'),
  ).toBeVisible();
});

test('login is a standalone screen that fits without page scrolling', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('main')).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight),
  ).toBe(true);
});

test('unsaved writing warns before navigation and cancel keeps the draft', async ({
  page,
}, testInfo) => {
  const writing = await openEditor(page);
  let warned = false;
  page.on('dialog', async (dialog) => {
    warned = true;
    await dialog.dismiss();
  });
  if (testInfo.project.name === 'mobile')
    await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  expect(warned).toBe(true);
  if (testInfo.project.name === 'mobile')
    await page.getByRole('button', { name: 'Close menu' }).click();
  await expect(writing).toHaveValue(message);
});

test('saved drafts navigate without a warning', async ({ page }, testInfo) => {
  await page.route('**/api/draft', (route) => route.fulfill({ json: { ok: true } }));
  await openEditor(page);
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByText('Draft saved to your account')).toBeVisible();
  page.on('dialog', () => {
    throw new Error('Saved writing should not warn');
  });
  if (testInfo.project.name === 'mobile')
    await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Make this space yours' })).toBeVisible();
});

test('settings distinguish active account storage from deferred preferences', async ({ page }) => {
  await page.goto('/settings');
  await expect(
    page.getByText(
      'Saved drafts and feedback are stored privately in your account. Checking or requesting development help sends your writing to the AI coach. Export and account deletion are not available yet.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Explanation language' })).toBeDisabled();
  await expect(page.getByRole('combobox', { name: 'Daily writing target' })).toBeDisabled();
  await expect(page.getByRole('combobox', { name: 'Weekly goal' })).toBeDisabled();
});

test('live editor has a page heading', async ({ page }) => {
  await page.goto('/dev/preview/live-write');
  await expect(page.getByRole('heading', { name: 'Writing Studio', level: 1 })).toBeVisible();
});

test('feedback marks open keyboard-reachable correction details', async ({ page }, testInfo) => {
  await page.goto('/dev/preview/feedback');
  const correction = page.getByRole('button', { name: 'go: went', exact: true });
  await correction.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#correction-details').filter({ visible: true })).toContainText('went');
  if (testInfo.project.name === 'mobile') await page.keyboard.press('Escape');
  await expect(
    page.getByRole('link', {
      name: testInfo.project.name === 'mobile' ? 'Write' : 'Writing Studio',
      exact: true,
    }),
  ).toHaveAttribute('aria-current', 'page');
});

test('failed save preserves text and provides a visible recovery action', async ({ page }) => {
  await page.route('**/api/draft', (route) => route.fulfill({ status: 500, json: { ok: false } }));
  const writing = await openEditor(page);
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Draft could not be saved' }),
  ).toBeVisible();
  await expect(writing).toHaveValue(message);
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeEnabled();
});

test('expired session offers sign-in without discarding writing', async ({ page }) => {
  await page.route('**/api/feedback', (route) =>
    route.fulfill({ status: 401, json: { ok: false, error: { code: 'UNAUTHENTICATED' } } }),
  );
  const writing = await openEditor(page);
  await page.getByRole('button', { name: 'Check my writing', exact: true }).click();
  await expect(
    page.getByText('Your session expired. Copy your writing, then sign in again.'),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in again' })).toHaveAttribute('href', '/login');
  await expect(writing).toHaveValue(message);
});

test('a failed recovered check reports an unknown cause and preserves writing for retry', async ({
  page,
}) => {
  let posts = 0;
  await page.route('**/api/feedback**', (route) => {
    if (route.request().method() === 'POST') {
      posts++;
      return route.fulfill({ status: 202, json: { ok: true, data: { status: 'pending' } } });
    }
    return route.fulfill({
      json: { ok: true, data: { submissionId: 'failed', status: 'failed' } },
    });
  });
  const writing = await openEditor(page);
  await page.getByRole('button', { name: 'Check my writing', exact: true }).click();
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: 'This check failed. Its original error is unavailable.' }),
  ).toBeVisible();
  await expect(writing).toHaveValue(message);
  expect(posts).toBe(1);
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect.poll(() => posts).toBe(2);
});

test('invalid coach output is not described as a provider outage', async ({ page }) => {
  await page.route('**/api/feedback', (route) =>
    route.fulfill({ status: 502, json: { ok: false, error: { code: 'COACH_INVALID_RESPONSE' } } }),
  );
  const writing = await openEditor(page);
  await page.getByRole('button', { name: 'Check my writing', exact: true }).click();
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: 'The coach returned feedback we could not validate.' }),
  ).toBeVisible();
  await expect(writing).toHaveValue(message);
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeEnabled();
});

test('daily quota explains when checking can resume', async ({ page }) => {
  await page.route('**/api/feedback', (route) =>
    route.fulfill({ status: 429, json: { ok: false, error: { code: 'DAILY_LIMIT' } } }),
  );
  const writing = await openEditor(page);
  await page.getByRole('button', { name: 'Check my writing', exact: true }).click();
  await expect(
    page.getByText('You have used today’s 20 checks. Return tomorrow (UTC).'),
  ).toBeVisible();
  await expect(writing).toHaveValue(message);
});
