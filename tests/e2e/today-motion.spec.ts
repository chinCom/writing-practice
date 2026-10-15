import { expect, test } from '@playwright/test';

for (const [reducedMotion, moves] of [
  ['no-preference', true],
  ['reduce', false],
] as const) {
  test(`Today week card follows ${reducedMotion} motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto('/dev/preview/today');
    const week = page.getByTestId('today-week');
    const ring = week.getByRole('img', { name: '4 of 5 sessions this week' });
    const fill = ring.locator('circle').nth(1);
    // The preview week has 4 of 5 sessions, so the ring settles with 20% of the stroke hidden.
    await expect
      .poll(async () =>
        fill.evaluate((element) => {
          const style = getComputedStyle(element);
          return parseFloat(style.strokeDashoffset) / parseFloat(style.strokeDasharray);
        }),
      )
      .toBeCloseTo(0.2, 1);
    const duration = await fill.evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(duration).toBe(moves ? '0.9s' : '0s');
    const tick = week.locator('svg[data-testid="CheckCircleIcon"]').first();
    const name = await tick.evaluate((element) => getComputedStyle(element).animationName);
    if (moves) expect(name).not.toBe('none');
    else expect(name).toBe('none');
  });
}
