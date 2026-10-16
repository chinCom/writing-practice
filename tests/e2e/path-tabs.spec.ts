import { test, expect } from '@playwright/test';

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`track underline follows selection with ${reducedMotion} motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto('/dev/preview/path?course=full&track=core');
    const indicator = page.locator('.MuiTabs-indicator');
    for (const tab of await page.getByRole('tab').all()) {
      await expect(tab).toHaveCSS('border-bottom-width', '1px');
      await expect(tab).toHaveCSS('border-bottom-style', 'solid');
    }
    await expect(indicator).toHaveCSS('height', '4px');
    await expect(indicator).toHaveCSS(
      'transition-duration',
      reducedMotion === 'reduce' ? '0s' : '0.25s, 0.25s',
    );
    for (const name of ['IELTS Writing Workspace', 'Core Writing Path']) {
      const tab = page.getByRole('tab', { name: new RegExp(name) });
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect
        .poll(async () => {
          const selected = await tab.boundingBox();
          const underline = await indicator.boundingBox();
          return selected && underline ? Math.abs(selected.x - underline.x) : Infinity;
        })
        .toBeLessThan(2);
    }
    await page.screenshot({ path: test.info().outputPath('path-tabs.png') });
  });
}
