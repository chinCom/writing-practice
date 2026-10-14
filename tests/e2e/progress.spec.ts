import { expect, test } from '@playwright/test';

test('progress shows saved totals, stable estimates, and accessible writing days', async ({
  page,
}) => {
  await page.goto('/dev/preview/progress');
  await expect(page.getByRole('heading', { name: 'See your writing grow' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Words written' })).toContainText('175');
  await expect(page.getByRole('group', { name: 'Current streak' })).toContainText('3');
  await expect(page.getByText('Practice estimates, not a certified assessment.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your review insights' })).toBeVisible();
  await expect(page.getByRole('row', { name: /Verb tense/ })).toContainText('Not reviewed yet');
  await expect(page.getByLabel('October 14, 2026: writing day', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('a private progress request explains a missing session and permits retry', async ({
  page,
}) => {
  await page.route('**/dev/preview/progress-data', (route) =>
    route.fulfill({ status: 401, json: { ok: false, error: { code: 'UNAUTHENTICATED' } } }),
  );
  await page.goto('/dev/preview/progress');
  await expect(page.getByText('Your session ended. Sign in again to view progress.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in again' })).toHaveAttribute('href', '/login');
});
