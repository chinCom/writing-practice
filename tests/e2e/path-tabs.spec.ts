import { expect, test } from '@playwright/test';

test('the track pill slides between selections in both directions', async ({ page }) => {
  await page.goto('/dev/preview/path?course=full&track=core');
  const indicator = page.locator('.MuiTabs-indicator');
  const core = page.getByRole('tab', { name: /Core Writing Path/ });
  const ielts = page.getByRole('tab', { name: /IELTS Writing Workspace/ });

  await expect(core).toHaveAttribute('aria-selected', 'true');
  await expect(indicator).toBeVisible();
  await expect(indicator).toHaveCSS('border-radius', '999px');
  await expect(indicator).toHaveCSS('transition-duration', '0.38s, 0.38s');
  await expect(indicator).toHaveCSS('transition-property', 'left, width');

  const x = async () => (await indicator.boundingBox())?.x ?? 0;
  const start = (await core.boundingBox())!.x;
  const end = (await ielts.boundingBox())!.x;
  await expect.poll(async () => Math.abs((await x()) - start)).toBeLessThan(2);

  await ielts.click();
  await expect(ielts).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(/track=ielts/);
  await expect.poll(async () => Math.abs((await x()) - end)).toBeLessThan(2);

  await core.click();
  await expect(core).toHaveAttribute('aria-selected', 'true');
  await expect.poll(async () => Math.abs((await x()) - start)).toBeLessThan(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
