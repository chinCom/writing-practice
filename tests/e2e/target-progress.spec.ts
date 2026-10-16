import { expect, test } from '@playwright/test';

test('Targets shows provisional first-attempt evidence, rates and UTC review dates', async ({
  page,
}) => {
  await page.goto('/dev/preview/progress');
  const targets = page.getByRole('region', { name: 'Targets', exact: true });
  await expect(targets).toBeVisible();
  await expect(targets).toContainText('Provisional');
  await expect(targets).toContainText('Review due');
  await expect(targets).toContainText('Secure');
  await expect(targets).toContainText('Unknown');
  await expect(targets).toContainText('30%');
  await expect(targets).toContainText('10%');
  await expect(targets).toContainText('Not used');
  await expect(targets).toContainText('UTC');
  await expect(targets).toContainText('not a mastery certificate');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Targets has an honest empty state', async ({ page }) => {
  await page.goto('/dev/preview/progress-empty');
  const targets = page.getByRole('region', { name: 'Targets', exact: true });
  await expect(targets).toContainText('Complete a Core writing check with target feedback');
  await expect(targets.getByRole('listitem')).toHaveCount(0);
  await expect(targets).not.toContainText('NaN');
});

test('Targets translates and fits Vietnamese dark mode with reduced motion', async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: 'locale', value: 'vi', url: baseURL! }]);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('mui-mode', 'dark'));
  await page.goto('/dev/preview/progress');
  const targets = page.getByRole('region', { name: 'Mục tiêu', exact: true });
  await expect(targets).toBeVisible();
  await expect(targets).toContainText('Tạm tính');
  await expect(targets).toContainText('Đến hạn ôn');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
