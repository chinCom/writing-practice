import { expect, test } from '@playwright/test';

test('the first session shows the whole loop and marks the next step', async ({ page }) => {
  await page.goto('/dev/preview/today-first');
  const guide = page.getByTestId('first-session');
  await expect(guide.getByRole('heading', { name: 'Your first session' })).toBeVisible();
  const steps = guide.getByRole('list', { name: 'First session steps' });
  await expect(steps.getByRole('listitem')).toHaveCount(5);
  await expect(steps.locator('[data-step="signIn"]')).toHaveAttribute('data-state', 'done');
  await expect(steps.locator('[data-step="choose"]')).toHaveAttribute('data-state', 'done');
  await expect(steps.locator('[data-step="write"]')).toHaveAttribute('data-state', 'current');
  await expect(steps.locator('[data-step="revise"]')).toHaveAttribute('data-state', 'upcoming');
  await expect(steps.locator('[aria-current="step"]')).toHaveAttribute('data-step', 'write');
  await expect(guide.getByRole('link', { name: 'Read your feedback' })).toHaveCount(0);
});

test('placement is the first step when the learner has no level yet', async ({ page }) => {
  await page.goto('/dev/preview/today-placement');
  const steps = page.getByTestId('first-session').getByRole('list', {
    name: 'First session steps',
  });
  await expect(steps.locator('[aria-current="step"]')).toHaveAttribute('data-step', 'choose');
});

test('a waiting check points at feedback and then at revision', async ({ page }) => {
  await page.goto('/dev/preview/today-first-feedback');
  const guide = page.getByTestId('first-session');
  const read = guide.getByRole('link', { name: 'Read your feedback' });
  await expect(read).toHaveAttribute('href', '/dev/preview/feedback-first');
  await read.click();
  await expect(page).toHaveURL(/\/dev\/preview\/feedback-first$/);
  const feedbackGuide = page.getByTestId('first-session');
  await expect(
    feedbackGuide
      .getByRole('list', { name: 'First session steps' })
      .locator('[aria-current="step"]'),
  ).toHaveAttribute('data-step', 'revise');
  await expect(page.getByRole('link', { name: 'Revise your writing', exact: true })).toBeVisible();
});

test('the writing screen states what happens after Check', async ({ page }) => {
  await page.goto('/dev/preview/live-write');
  await expect(
    page.getByText('After Check, you’ll see your marked page and one priority to fix.'),
  ).toBeVisible();
});

test('the guide ends after the first revision', async ({ page }) => {
  await page.goto('/dev/preview/today');
  await expect(page.getByTestId('first-session')).toHaveCount(0);
});

test('the first session stays readable in Vietnamese on a phone', async ({ page, context }) => {
  await context.addCookies([{ name: 'locale', value: 'vi', url: 'http://127.0.0.1:3000' }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dev/preview/today-first');
  const guide = page.getByTestId('first-session');
  await expect(guide.getByRole('heading', { name: 'Buổi học đầu tiên' })).toBeVisible();
  await expect(
    guide
      .getByRole('list', { name: 'Các bước của buổi học đầu tiên' })
      .locator('[aria-current="step"]'),
  ).toHaveAttribute('data-step', 'write');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
