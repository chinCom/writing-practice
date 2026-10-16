import { test, expect } from '@playwright/test';
for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`noticing checks selections without revealing answers first ${viewport.width}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/dev/preview/lesson-noticing');
    const region = page.getByRole('region', { name: 'Read and notice' });
    await expect(region).toBeVisible();
    await expect(region).not.toContainText('Both sentences use');
    await region.getByRole('button', { name: 'am', exact: true }).first().click();
    await region.getByRole('button', { name: 'Check selections' }).click();
    await expect(region.getByRole('status')).toContainText('Try again');
    await region.getByRole('button', { name: 'am', exact: true }).last().focus();
    await page.keyboard.press('Space');
    await region.getByRole('button', { name: 'Check selections' }).click();
    await expect(region.getByRole('status')).toContainText('Both sentences use');
  });
}
