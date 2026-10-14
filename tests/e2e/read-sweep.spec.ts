import { expect, test } from '@playwright/test';

const message =
  'Hi Maria! Last weekend I went to the beach with my family. The weather was warm and we swam in the sea. I ate ice cream and my brother lost his hat. Would you like to come to the beach with us next weekend?';

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`checking preserves writing and respects ${reducedMotion} motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    let release: () => void = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/feedback', async (route) => {
      await pending;
      await route.fulfill({ status: 502, json: { ok: false, error: { code: 'COACH_TIMEOUT' } } });
    });
    await page.goto('/dev/preview/live-write');
    const writing = page.getByRole('textbox', { name: 'Your writing', exact: true });
    await writing.fill(message);
    await page.getByRole('button', { name: 'Check my writing', exact: true }).click();
    await expect(writing).toBeDisabled();
    await expect(writing).toHaveValue(message);
    await expect(page.getByText('The coach is reading your writing…')).toBeVisible();
    const sweep = page.locator('[data-read-sweep]');
    if (reducedMotion === 'reduce') {
      await expect(sweep).toHaveCount(0);
    } else {
      await expect(sweep).toBeVisible();
      await expect(sweep).toHaveAttribute('aria-hidden', 'true');
      const bands = sweep.locator('[data-sweep-band]');
      await expect.poll(() => bands.count()).toBeGreaterThan(1);
      const geometry = await bands.evaluateAll((elements) =>
        elements.map((element) => {
          const style = getComputedStyle(element);
          return {
            top: parseFloat(style.insetBlockStart),
            width: parseFloat(style.inlineSize),
            animation: style.animationName,
          };
        }),
      );
      expect(
        geometry.every((band) => band.width > 0 && band.top >= 0 && band.animation !== 'none'),
      ).toBe(true);
      const before = geometry.length;
      await page.setViewportSize({ width: 320, height: 1200 });
      await expect.poll(() => bands.count()).toBeGreaterThan(before);
    }
    release();
    await expect(writing).toBeEnabled();
    await expect(writing).toHaveValue(message);
    await expect(sweep).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
  });
}
