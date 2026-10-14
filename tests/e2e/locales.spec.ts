import { expect, test } from '@playwright/test';

test('old Arabic preferences fall back to English without a reversed layout', async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: 'locale', value: 'ar', url: 'http://127.0.0.1:3000' },
    { name: 'direction', value: 'rtl', url: 'http://127.0.0.1:3000' },
    { name: 'explanation', value: 'ar', url: 'http://127.0.0.1:3000' },
  ]);
  await page.goto('/settings');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('heading', { name: 'Make this space yours' })).toBeVisible();
  await page.getByRole('combobox', { name: 'UI language', exact: true }).click();
  await expect(page.getByRole('option')).toHaveCount(2);
  await expect(page.getByRole('option', { name: 'Tiếng Việt' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'العربية' })).toHaveCount(0);
});
