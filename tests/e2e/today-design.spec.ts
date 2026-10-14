import { expect, test } from '@playwright/test';

test('Today keeps empty account states honest', async ({ page }) => {
  await page.goto('/dev/preview/today-account');
  await expect(page.getByText('No feedback yet. Start with one short message.')).toBeVisible();
  await expect(
    page.getByText('Choose your starting level to begin your learning path.'),
  ).toBeVisible();
  await expect(page.getByText('Weekend message', { exact: true })).toHaveCount(0);
});

test('Today keeps account access in the mobile menu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dev/preview/today');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByRole('dialog').getByRole('link', { name: 'Sign in' })).toBeVisible();
});

test('Today actions remain usable in Vietnamese on a phone', async ({ page, context }) => {
  await context.addCookies([{ name: 'locale', value: 'vi', url: 'http://127.0.0.1:3000' }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dev/preview/today');
  await expect(page.getByRole('table', { name: 'Nhận xét đã lưu' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ôn tập 12 câu' })).toHaveAttribute(
    'href',
    '/dev/preview/practice-page',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const width of [1586, 390]) {
  test(`Today dashboard keeps saved feedback and learning actions usable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 992 });
    await page.goto('/dev/preview/today');
    const table = page.getByRole('table', { name: 'Saved feedback' });
    await expect(table).toBeVisible();
    await expect(table.getByRole('row')).toHaveCount(4);
    const feedbackActions = [
      page.getByRole('link', { name: 'View portfolio', exact: true }),
      table.getByRole('link', { name: 'Open feedback' }).first(),
    ];
    for (const action of feedbackActions) {
      await action.hover();
      const padding = await action.evaluate((element) => {
        const style = getComputedStyle(element);
        return [parseFloat(style.paddingInlineStart), parseFloat(style.paddingInlineEnd)];
      });
      expect(padding[0]).toBeGreaterThanOrEqual(12);
      expect(padding[1]).toBeGreaterThanOrEqual(12);
    }
    await expect(table.getByRole('link', { name: 'Open feedback' }).first()).toHaveAttribute(
      'href',
      '/dev/preview/feedback',
    );
    await expect(page.getByRole('link', { name: 'Review 12 questions' })).toHaveAttribute(
      'href',
      '/dev/preview/practice-page',
    );
    await expect(
      page.getByRole('link', { name: 'Open learning path', exact: true }),
    ).toHaveAttribute('href', '/dev/preview/path');
    await expect(page.getByRole('img', { name: '4 of 5 sessions this week' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width === 1586) {
      const task = await page.getByTestId('today-task').boundingBox();
      const week = await page.getByTestId('today-week').boundingBox();
      expect(Math.abs(task!.y - week!.y)).toBeLessThan(2);
      expect(task!.width).toBeGreaterThan(week!.width);
      expect(Math.abs(task!.height - week!.height)).toBeLessThan(2);
    }
  });
}
