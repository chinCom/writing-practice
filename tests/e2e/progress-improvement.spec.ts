import { expect, test } from '@playwright/test';

test('Progress compares first and latest checks and shows course completion', async ({ page }) => {
  await page.goto('/dev/preview/progress');
  const improvement = page.getByRole('region', { name: 'Your improvement' });
  await expect(improvement).toBeVisible();
  const table = improvement.getByRole('table');
  await expect(table.getByRole('row', { name: /Grammar/ })).toContainText('1.7');
  await expect(table.getByRole('row', { name: /Grammar/ })).toContainText('3.3');
  await expect(table.getByRole('row', { name: /Errors per 100 words/ })).toBeVisible();
  await expect(improvement.getByText('Average score went from', { exact: false })).toBeVisible();
  await expect(improvement.getByText(/Your revisions scored \+/)).toBeVisible();
  await expect(improvement.getByText(/not CEFR or IELTS results/)).toBeVisible();
  const course = page.getByRole('region', { name: 'Your course' });
  await expect(course.getByText(/of 63 lessons/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('empty state: Progress asks for more checks instead of an empty chart', async ({ page }) => {
  await page.goto('/dev/preview/progress-empty');
  const improvement = page.getByRole('region', { name: 'Your improvement' });
  await expect(improvement).toContainText(
    'Write 6 more checked pieces to see how you are improving.',
  );
  await expect(improvement.getByRole('table')).toHaveCount(0);
  await expect(page.getByText('NaN')).toHaveCount(0);
});
