import { expect, test } from '@playwright/test';

test('Today uses real activity totals and due reviews instead of preview achievements', async ({
  page,
}) => {
  await page.goto('/dev/preview/today-account');
  await expect(page.getByRole('img', { name: '4 of 5 sessions this week' })).toBeVisible();
  await expect(page.getByText('3-day writing streak', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Review 2 questions' })).toHaveAttribute(
    'href',
    '/practice',
  );
  await expect(page.getByRole('img', { name: 'Friday: not yet written' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
