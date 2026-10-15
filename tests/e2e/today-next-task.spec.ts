import { expect, test } from '@playwright/test';

test('Today offers the current lesson instead of a fixed weekend task', async ({ page }) => {
  await page.goto('/dev/preview/today');
  const card = page.getByTestId('today-task');
  await expect(card).not.toContainText('Tell a friend about your weekend');
  await expect(card).not.toContainText('Hi Maria! Last weekend…');
  await expect(card.getByText(/^Your focus: /)).toBeVisible();
  await expect(card.getByText(/\d+–\d+ words/)).toBeVisible();
  await expect(card.getByRole('link', { name: /Start lesson|Continue writing/ })).toBeVisible();
});

test('Today asks for placement before the first lesson', async ({ page }) => {
  await page.goto('/dev/preview/today-placement');
  const card = page.getByTestId('today-task');
  await expect(card.getByRole('heading', { name: 'Find your starting level' })).toBeVisible();
  await expect(card.getByRole('link', { name: 'Start placement' })).toBeVisible();
});

test('goal met: the weekly ring never shows more sessions than the goal as "10 of 5"', async ({
  page,
}) => {
  await page.goto('/dev/preview/today-goal-met');
  await expect(
    page.getByRole('img', { name: '10 sessions this week. Goal of 5 met.' }),
  ).toBeVisible();
  await expect(page.getByText('10 of 5')).toHaveCount(0);
  await expect(page.getByText('Goal met', { exact: true })).toBeVisible();
});

test('Today shows the strongest improvement from the progress report', async ({ page }) => {
  await page.goto('/dev/preview/today-goal-met');
  await expect(page.getByText(/since your first checks$/)).toBeVisible();
  await expect(page.getByText(/They are not CEFR or IELTS results/)).toBeVisible();
});
