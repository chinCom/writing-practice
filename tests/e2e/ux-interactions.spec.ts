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

test('Arabic feedback keeps the English writing left-to-right without overflowing', async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: 'locale', value: 'ar', url: 'http://127.0.0.1:3000' },
    { name: 'direction', value: 'rtl', url: 'http://127.0.0.1:3000' },
  ]);
  await page.goto('/dev/preview/feedback');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('[dir="ltr"]').first()).toContainText('Hi Maria!');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
