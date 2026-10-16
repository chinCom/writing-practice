import { expect, test } from '@playwright/test';

const draft =
  'Hi Maria! Last weekend I visited my family. We cooked together and walked in the park.';
const slowTitle = 'This is taking a little longer';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('offline notice preserves writing, can be dismissed, and returns for a new outage', async ({
  page,
  context,
}, info) => {
  await page.goto('/dev/preview/live-write');
  const editor = page.getByRole('textbox', { name: 'Your writing', exact: true });
  await editor.fill(draft);
  await context.setOffline(true);
  await expect(page.getByText('You are offline', { exact: true })).toBeVisible();
  await expect(editor).toHaveValue(draft);
  await expect(editor).toBeFocused();
  await page.screenshot({
    path: `docs/verification/ux/screenshots/network-offline-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Dismiss notification', exact: true }).click();
  await expect(page.getByText('You are offline', { exact: true })).toBeHidden();
  await context.setOffline(false);
  await context.setOffline(true);
  await expect(page.getByText('You are offline', { exact: true })).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText('You are offline', { exact: true })).toBeHidden();
  await expect(page.getByText(slowTitle, { exact: true })).toBeHidden();
  await expect(editor).toHaveValue(draft);
});

test('a slow save shows one notice without stealing focus or repeating the write', async ({
  page,
}, info) => {
  let complete: () => void = () => undefined;
  const waiting = new Promise<void>((resolve) => {
    complete = resolve;
  });
  let writes = 0;
  await page.route('**/api/draft', async (route) => {
    writes++;
    await waiting;
    await route.fulfill({ json: { ok: true } });
  });
  try {
    await page.goto('/dev/preview/live-write');
    const editor = page.getByRole('textbox', { name: 'Your writing', exact: true });
    await editor.fill(draft);
    await page.clock.install();
    const saving = page.waitForRequest('**/api/draft');
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await saving;
    await editor.focus();
    await page.clock.fastForward(5001);
    await expect(page.getByText(slowTitle, { exact: true })).toBeVisible();
    await expect(editor).toBeFocused();
    await expect(editor).toHaveValue(draft);
    expect(writes).toBe(1);
    await page.screenshot({
      path: `docs/verification/ux/screenshots/network-slow-${info.project.name}.png`,
      fullPage: true,
    });
    complete();
    await expect(page.getByText(slowTitle, { exact: true })).toBeHidden();
    await expect(page.getByText('Draft saved to your account', { exact: true })).toBeVisible();
    expect(writes).toBe(1);
  } finally {
    complete();
  }
});

test('a fast response never leaves a delayed slow-loading notice', async ({ page }) => {
  await page.route('**/api/draft', (route) => route.fulfill({ json: { ok: true } }));
  await page.goto('/dev/preview/live-write');
  await page.getByRole('textbox', { name: 'Your writing', exact: true }).fill(draft);
  await page.clock.install();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByText('Draft saved to your account', { exact: true })).toBeVisible();
  await page.clock.fastForward(6000);
  await expect(page.getByText(slowTitle, { exact: true })).toBeHidden();
});

test('server page loading shows a slow notice and clears it when the page arrives', async ({
  page,
}) => {
  test.setTimeout(45000);
  await page.goto('/dev/preview/connection/ready');
  await page.getByRole('link', { name: 'Load a slow page', exact: true }).click();
  await expect(page.getByText('Loading your page…', { exact: true })).toBeVisible();
  await expect(page.getByText(slowTitle, { exact: true })).toBeVisible({ timeout: 8000 });
  await expect(
    page.getByRole('heading', { name: 'Connection preview is ready', exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(slowTitle, { exact: true })).toBeHidden();
});

test('a server error shows a friendly dialog and retry refetches the page', async ({
  page,
  context,
}, info) => {
  await page.goto('/dev/preview/connection/error');
  const dialog = page.getByRole('alertdialog', { name: 'We could not load this page' });
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toContainText('DATABASE_TIMEOUT');
  await expect(dialog).not.toContainText('Synthetic');
  await page.screenshot({
    path: `docs/verification/ux/screenshots/network-error-${info.project.name}.png`,
    fullPage: true,
  });
  await context.addCookies([
    { name: 'connection_preview_ready', value: 'true', url: new URL(page.url()).origin },
  ]);
  await dialog.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Connection preview is ready', exact: true }),
  ).toBeVisible();
  await expect(dialog).toBeHidden();
});

test('Vietnamese offline notice fits dark mode without covering mobile navigation', async ({
  page,
  context,
}, info) => {
  await context.addCookies([{ name: 'locale', value: 'vi', url: 'http://127.0.0.1:3000' }]);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/dev/preview/connection/ready');
  await context.setOffline(true);
  const notice = page.getByRole('status').filter({ hasText: 'Bạn đang mất kết nối mạng' });
  await expect(notice).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `docs/verification/ux/screenshots/network-offline-vi-dark-${info.project.name}.png`,
    fullPage: true,
  });
  if (info.project.name === 'mobile') {
    const bounds = await notice.boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThan(844 - 60);
  }
  await context.setOffline(false);
  await expect(notice).toBeHidden();
});
