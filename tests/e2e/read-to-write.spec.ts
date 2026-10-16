import { expect, test } from '@playwright/test';

for (const mode of ['summary', 'continuation']) {
  test(`keeps the ${mode} source available while writing without changing the task range`, async ({
    page,
  }) => {
    await page.goto('/dev/preview/read-' + mode);
    const reading = page.getByRole('region', { name: 'Read before you write' });
    await expect(reading).toBeVisible();
    await expect(reading.getByRole('heading', { name: 'A shared garden' })).toBeVisible();
    await expect(reading).toContainText('The neighbours opened a shared garden');
    await expect(reading).toContainText(
      mode === 'summary' ? 'main ideas in your own words' : 'Continue the passage',
    );
    await expect(page.getByText('100–180 words', { exact: true })).toBeVisible();
    const canvas = page.getByRole('textbox', { name: 'Your writing' });
    await canvas.fill('This is my own response to the source.');
    await expect(reading).toContainText('The neighbours opened a shared garden');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}

test('legacy writing tasks have no reading panel', async ({ page }) => {
  await page.goto('/dev/preview/curriculum-write');
  await expect(page.getByRole('region', { name: 'Read before you write' })).toHaveCount(0);
});
