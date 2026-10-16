import { expect, test } from '@playwright/test';

test('Progress labels unmatched trends and shows course completion', async ({ page }) => {
  await page.goto('/dev/preview/progress');
  const improvement = page.getByRole('region', { name: 'Your improvement' });
  await expect(improvement).toBeVisible();
  await expect(improvement.getByRole('table')).toHaveCount(0);
  await expect(improvement).toContainText('descriptive, not benchmark evidence');
  await expect(improvement.getByText('Average score went from', { exact: false })).toBeVisible();
  await expect(
    improvement.getByText(/How much you fixed: revision scores changed by \+/),
  ).toBeVisible();
  await expect(improvement.getByText(/not CEFR or IELTS results/)).toBeVisible();
  const course = page.getByRole('region', { name: 'Your course' });
  await expect(course.getByText(/of 63 lessons/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('empty state: Progress asks for more checks instead of an empty chart', async ({ page }) => {
  await page.goto('/dev/preview/progress-empty');
  const improvement = page.getByRole('region', { name: 'Your improvement' });
  await expect(improvement).toContainText('Historical trends use different tasks');
  await expect(improvement.getByRole('table')).toHaveCount(0);
  await expect(page.getByText('NaN')).toHaveCount(0);
});
