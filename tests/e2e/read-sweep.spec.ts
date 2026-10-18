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

test('sweep bands stay one per line, evenly spaced, with emoji and a scrolled draft', async ({
  page,
}) => {
  await page.route('**/api/feedback', () => new Promise(() => {}));
  await page.goto('/dev/preview/live-write');
  const writing = page.getByRole('textbox', { name: 'Your writing', exact: true });
  const sentence =
    'We went to see a movie 🎬 and I felt scared 😱 for one moment, but it was fun. ';
  await writing.fill(sentence.repeat(14));
  await writing.evaluate((element) => {
    // Keep this scroll test independent of the editor's responsive width.
    element.style.height = '200px';
    element.scrollTop = 90;
    element.dispatchEvent(new Event('scroll'));
  });
  await expect.poll(() => writing.evaluate((element) => element.scrollTop)).toBe(90);
  await page.getByRole('button', { name: 'Check my writing', exact: true }).click();
  const bands = page.locator('[data-sweep-band]');
  await expect.poll(() => bands.count()).toBeGreaterThan(4);
  const rows = await bands.evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      return { top: parseFloat(style.insetBlockStart), height: parseFloat(style.blockSize) };
    }),
  );
  const pitch = rows[1].top - rows[0].top;
  for (const [index, row] of rows.entries()) {
    expect(row.height).toBeCloseTo(rows[0].height, 0);
    expect(row.top - rows[0].top).toBeCloseTo(index * pitch, 0);
  }
  const track = page.locator('[data-read-sweep] > div:last-child');
  await expect(track).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -90)');
});

test('the sweep reads one line at a time, in order', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route('**/api/feedback', () => new Promise(() => {}));
  await page.goto('/dev/preview/live-write');
  await page.getByRole('textbox', { name: 'Your writing', exact: true }).fill(message);
  await page.getByRole('button', { name: 'Check my writing', exact: true }).click();
  const bands = page.locator('[data-sweep-band]');
  await expect.poll(() => bands.count()).toBeGreaterThan(2);
  // Each band's wipe window, as offsets of the shared loop.
  const windows = await bands.evaluateAll((elements) =>
    elements.map((element) => {
      const [animation] = element.getAnimations();
      const frames = (animation.effect as KeyframeEffect).getKeyframes();
      const hidden = frames.filter((frame) => String(frame.clipPath).includes('100%'));
      const full = frames.filter((frame) => !String(frame.clipPath).includes('100%'));
      return {
        duration: Number(animation.effect!.getTiming().duration),
        start: Number(hidden[hidden.length - 1].offset),
        end: Number(full[0].offset),
      };
    }),
  );
  expect(windows[0].start).toBe(0);
  for (const [index, window] of windows.entries()) {
    expect(window.duration).toBe(windows[0].duration);
    expect(window.end).toBeGreaterThan(window.start);
    if (index) expect(window.start).toBeCloseTo(windows[index - 1].end, 3);
  }
});
