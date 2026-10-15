import { expect, test } from '@playwright/test';

// Synthetic reports exercise the real feedback screen, not grader accuracy.
test('targets come before strengths and distinguish errors from unused structures', async ({
  page,
}) => {
  await page.goto('/dev/preview/feedback-targets');
  const targets = page.getByRole('region', { name: 'Your targets', exact: true });
  await expect(targets).toBeVisible();
  await expect(targets).toContainText('Verb tense');
  await expect(targets).toContainText('3 of 6 uses correct');
  await expect(targets).toContainText('3 errors to review');
  await expect(targets).toContainText('Articles');
  await expect(targets).toContainText(
    'Not used in this writing. Try this target in your next draft.',
  );
  const beforeStrengths = await targets.evaluate((section) => {
    const strength = [...document.querySelectorAll('span')].find(
      (element) => element.textContent === 'You described a weekend activity.',
    );
    return (
      !!strength && !!(section.compareDocumentPosition(strength) & Node.DOCUMENT_POSITION_FOLLOWING)
    );
  });
  expect(beforeStrengths).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('old feedback does not invent a target report', async ({ page }) => {
  await page.goto('/dev/preview/feedback');
  await expect(page.getByRole('heading', { name: 'Your marked page' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Your targets', exact: true })).toHaveCount(0);
});

test('unsafe feedback suppresses target counts', async ({ page }) => {
  await page.goto('/dev/preview/feedback-targets-safety');
  await expect(page.getByRole('alert').filter({ hasText: 'You deserve support.' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Your targets', exact: true })).toHaveCount(0);
});

test('Vietnamese target counts wrap in dark mode', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'locale', value: 'vi', url: baseURL! }]);
  await page.addInitScript(() => localStorage.setItem('mui-mode', 'dark'));
  await page.goto('/dev/preview/feedback-targets');
  const targets = page.getByRole('region', { name: 'Mục tiêu của bạn', exact: true });
  await expect(targets).toContainText('Đúng 3 trên 6 lần sử dụng');
  await expect(targets).toContainText('Chưa sử dụng trong bài viết này.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
