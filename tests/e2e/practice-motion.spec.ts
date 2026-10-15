import { expect, test } from '@playwright/test';

const questions = [1, 2, 3].map((number) => ({
  id: '00000000-0000-4000-8000-00000000006' + number,
  version: 0,
  text: 'We swimmed in the sea last weekend.',
  start: 3,
  end: 10,
  original: 'swimmed',
  tag: 'verb-form',
}));

for (const [reducedMotion, moves] of [
  ['no-preference', true],
  ['reduce', false],
] as const) {
  test(`practice steps, result, and completion follow ${reducedMotion} motion`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    await page.addInitScript(() => {
      const fades: string[] = [];
      Object.assign(window, { fades });
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (...args: Parameters<Element['animate']>) {
        fades.push(this.tagName);
        return animate.apply(this, args);
      };
    });
    await page.route('**/dev/preview/practice', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          json: { ok: true, questions, nextReviewAt: null },
        });
        return;
      }
      await route.fulfill({
        json: {
          ok: true,
          result: {
            correct: true,
            complete: true,
            version: 1,
            box: 1,
            days: 1,
            misses: 0,
            explanation: 'Use swam for past events.',
            suggestion: 'swam',
          },
        },
      });
    });
    await page.goto('/dev/preview/practice-page');
    const steps = page.getByRole('progressbar', { name: 'Practice progress' });
    await expect(steps).toHaveAttribute('aria-valuemax', '3');
    await expect(steps).toHaveAttribute('aria-valuenow', '0');
    await page.getByRole('textbox', { name: 'Correct phrase' }).fill('swam');
    await page.getByRole('button', { name: 'Check answer', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('That’s right');
    await page.getByRole('button', { name: 'Next question', exact: true }).click();
    await expect(steps).toHaveAttribute('aria-valuenow', '1');
    await expect(page.getByRole('textbox', { name: 'Correct phrase' })).toBeFocused();
    const fades = await page.evaluate(() => (window as never as { fades: string[] }).fades.length);
    if (moves) expect(fades).toBeGreaterThan(0);
    else expect(fades).toBe(0);
  });
}
