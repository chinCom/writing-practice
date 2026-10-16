import { test, expect } from '@playwright/test';
for (const width of [1440, 390]) {
  test(`transfer uses fresh context without leaking answers ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/dev/preview/practice-transfer');
    const region = page.getByRole('region', { name: 'Try a new sentence' });
    await expect(region).toBeVisible();
    await expect(region).toContainText('I have ___ apple.');
    await expect(region).not.toContainText('Use an before');
    await region.getByLabel('Complete the new sentence').fill('a');
    await region.getByRole('button', { name: 'Check new sentence', exact: true }).click();
    await expect(region.getByRole('status')).toContainText('Try once more');
    await expect(region).not.toContainText('Use an before');
    await region.getByLabel('Complete the new sentence').fill('an');
    await region.getByRole('button', { name: 'Check new sentence', exact: true }).click();
    await expect(region.getByRole('status')).toContainText('Use an before');
    await expect(region).toContainText('1 day');
  });
}
