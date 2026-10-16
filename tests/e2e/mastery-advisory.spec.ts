import { expect, test } from '@playwright/test';

test('Today and the next lesson show two recommendations without claiming enforced mastery', async ({
  page,
}) => {
  await page.goto('/dev/preview/today-carried');
  const today = page.getByRole('region', { name: 'Target recommendations' });
  await expect(today).toContainText('Verb tense');
  await expect(today).toContainText('Articles');
  await expect(today).toContainText('Carried for practice');
  await expect(today).toContainText('Recommendations only. Your lesson progress is unchanged.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/dev/preview/lesson-carried');
  const lesson = page.getByRole('region', { name: 'Target recommendations' });
  await expect(lesson).toContainText('Articles');
  await expect(lesson).toContainText('Unit focus');
  await expect(page.getByRole('heading', { name: 'Warm-ups', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Vietnamese recommendations wrap in dark mode', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'locale', value: 'vi', url: baseURL! }]);
  await page.addInitScript(() => localStorage.setItem('mui-mode', 'dark'));
  await page.goto('/dev/preview/today-carried');
  const section = page.getByRole('region', { name: 'Mục tiêu gợi ý' });
  await expect(section).toContainText('Mạo từ');
  await expect(section).toContainText('Tiếp tục luyện tập');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
