import { expect, test, type Locator } from '@playwright/test';

const animationName = (locator: Locator) =>
  locator.evaluate((element) => getComputedStyle(element).animationName);

for (const [reducedMotion, moves] of [
  ['no-preference', true],
  ['reduce', false],
] as const) {
  test(`marks, cards, and score bars follow ${reducedMotion} motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.addInitScript(() => {
      const fades: number[] = [];
      Object.assign(window, { cardFades: fades });
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (...args: Parameters<Element['animate']>) {
        if (this.querySelector('[data-card-details], [role="region"]')) fades.push(Date.now());
        return animate.apply(this, args);
      };
    });
    await page.goto('/dev/preview/feedback');
    const scoreBar = page.getByRole('progressbar').first();
    await expect(scoreBar).toHaveAttribute('aria-valuenow', /^\d+$/);
    const animated = [page.locator('[data-mark]').first(), scoreBar.locator('> *').first()];
    for (const locator of animated) {
      const name = await animationName(locator);
      if (moves) expect(name).not.toBe('none');
      else expect(name).toBe('none');
    }
    if (page.viewportSize()!.width >= 900) {
      const before = await page.evaluate(
        () => (window as never as { cardFades: number[] }).cardFades.length,
      );
      await page.locator('[data-card="1"] button').click();
      const after = await page.evaluate(
        () => (window as never as { cardFades: number[] }).cardFades.length,
      );
      if (moves) expect(after).toBeGreaterThan(before);
      else expect(after).toBe(before);
      await expect(page.getByRole('button', { name: 'Next correction' })).toBeVisible();
    }
  });
}
