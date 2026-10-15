import { test, expect } from '@playwright/test';
test('daily preview opens a locally saved writing draft without automatic correction', async ({
  page,
}) => {
  await page.goto('/dev/preview/today');
  await expect(page.getByRole('heading', { name: 'Make room for a little writing' })).toBeVisible();
  await page.getByRole('link', { name: 'Start lesson', exact: true }).click();
  const writing = page.getByRole('textbox', { name: 'Your writing' });
  await expect(writing).toHaveAttribute('spellcheck', 'false');
  await expect(writing).toHaveCSS('overflow-y', 'auto');
  for (const name of ['autocorrect', 'autocapitalize', 'autocomplete'])
    await expect(writing).toHaveAttribute(name, 'off');
  for (const name of ['data-gramm', 'data-gramm_editor', 'data-enable-grammarly'])
    await expect(writing).toHaveAttribute(name, 'false');
  await writing.fill('My own weekend message.');
  await expect(page.getByRole('status')).toContainText('Saved just now');
  await page.reload();
  await expect(writing).toHaveValue('My own weekend message.');
  await expect(page.getByText('4 words', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check my writing' })).toBeDisabled();
});
test('settings persist Vietnamese and a dark theme while writing stays left-to-right', async ({
  page,
}) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-mui-color-scheme', 'dark');
  await page.getByRole('combobox', { name: 'UI language' }).click();
  await expect(page.getByRole('option', { name: 'العربية' })).toHaveCount(0);
  await page.getByRole('option', { name: 'Tiếng Việt' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('heading', { name: 'Tùy chỉnh không gian của bạn' })).toBeVisible();
  await page.goto('/dev/preview/write');
  const writing = page.getByRole('textbox', { name: 'Bài viết của bạn' });
  await expect(writing).toHaveAttribute('dir', 'ltr');
  await expect(writing).toHaveAttribute('spellcheck', 'false');
  await page.goto('/settings');
  await page.getByRole('combobox', { name: 'Ngôn ngữ giao diện' }).click();
  await page.getByRole('option', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});
test('public Today shows an honest empty state, not sample achievements', async ({ page }) => {
  await page.goto('/today');
  await expect(page.getByRole('heading', { name: 'Make room for a little writing' })).toBeVisible();
  await expect(page.getByText('Your learning space is taking shape.')).toBeVisible();
  await expect(page.getByText('3 of 5')).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
});
test('mobile menu exposes Settings and Learning path', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile navigation only');
  await page.goto('/today');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByRole('link', { name: 'Learning path', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Make this space yours' })).toBeVisible();
});
