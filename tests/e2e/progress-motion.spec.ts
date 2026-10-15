import { expect, test } from '@playwright/test';

for (const [reducedMotion, moves] of [
  ['no-preference', true],
  ['reduce', false],
] as const) {
  test(`progress calendar and chart follow ${reducedMotion} motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto('/dev/preview/progress');
    await expect(page.locator('[aria-current="date"]')).toHaveCount(1);
    const writtenDay = page.getByRole('img', { name: /October 12, 2026: writing/i });
    const name = await writtenDay.evaluate((element) => getComputedStyle(element).animationName);
    if (moves) expect(name).not.toBe('none');
    else expect(name).toBe('none');
    const area = page.locator('.MuiLineChart-area');
    await expect(area).toHaveCount(1);
    const opacity = await area.evaluate((element) => getComputedStyle(element).fillOpacity);
    expect(parseFloat(opacity)).toBeCloseTo(0.16, 2);
  });
}
