import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import type { Locator } from '@playwright/test';

declare global {
  interface Window {
    loadingAudit: { seen: boolean; samples: number; blankFrames: number };
  }
}

function observeLoadingFrames() {
  const audit = { seen: false, samples: 0, blankFrames: 0 };
  window.loadingAudit = audit;
  function visible(element: Element) {
    const bounds = element.getBoundingClientRect();
    return (
      bounds.width > 0 && bounds.height > 0 && getComputedStyle(element).visibility !== 'hidden'
    );
  }
  function sample() {
    const loading = Array.from(document.querySelectorAll('[data-ui="loading-content"]')).some(
      visible,
    );
    if (loading) audit.seen = true;
    if (audit.seen) {
      audit.samples++;
      const content = Array.from(
        document.querySelectorAll('main .MuiPaper-root:not(.MuiAlert-root), main a.MuiButton-root'),
      ).some(visible);
      if (!loading && !content) audit.blankFrames++;
    }
    requestAnimationFrame(sample);
  }
  requestAnimationFrame(sample);
}

async function panelBounds(root: Locator) {
  return root.evaluate(async (element) => {
    // The skeleton shows no text, so its font may still be unloaded and the fallback font
    // wraps differently. Force every declared face to load before measuring.
    const families = Array.from(new Set(Array.from(document.fonts).map((face) => face.family)));
    await Promise.allSettled(
      families.map((family) => document.fonts.load('1rem "' + family.replace(/"/g, '') + '"')),
    );
    await document.fonts.ready;
    return Array.from(element.querySelectorAll('.MuiPaper-root'))
      .filter(
        (panel) =>
          !panel.matches('.MuiAlert-root') && !panel.parentElement?.closest('.MuiPaper-root'),
      )
      .filter((panel) => panel.getBoundingClientRect().height > 0)
      .map((panel) => {
        const bounds = panel.getBoundingClientRect();
        return { x: bounds.x, y: bounds.y + scrollY, width: bounds.width, height: bounds.height };
      });
  });
}

// The handwritten font loads lazily, so a single read can land between two layouts. Waiting for
// two identical reads compares the settled skeleton against the settled page.
async function settledPanelBounds(root: Locator) {
  let previous = '';
  let bounds: Awaited<ReturnType<typeof panelBounds>> = [];
  for (let attempt = 0; attempt < 60; attempt++) {
    bounds = await panelBounds(root);
    const signature = JSON.stringify(bounds);
    if (signature === previous) return bounds;
    previous = signature;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return bounds;
}

const screens = [
  ['today', 'today'],
  ['path', 'path'],
  ['lesson', 'lesson'],
  ['live-write', 'studio'],
  ['feedback', 'feedback'],
  ['practice-page', 'practice'],
  ['progress', 'progress'],
  ['portfolio', 'portfolio'],
  ['revision', 'revision'],
  ['settings', 'settings'],
  ['onboarding', 'onboarding'],
  ['placement', 'placement'],
  ['write', 'studio'],
  ['landing', 'landing'],
  ['login', 'login'],
  ['connection', 'connection'],
] as const;

for (const [screen, layout] of screens) {
  test(`${screen} streams its content-shaped skeleton and replaces it`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
    await page.addInitScript(observeLoadingFrames);
    let releaseHydration = () => {};
    if (screen === 'placement') {
      const hydrationReady = new Promise<void>((resolve) => {
        releaseHydration = resolve;
      });
      // Measure the streamed form before the textarea autosizer can adjust it.
      await page.route('**/_next/static/chunks/*.js', async (route) => {
        await hydrationReady;
        await route.continue();
      });
    }
    await page.route(
      '**/dev/preview/{portfolio-data,progress-data,revision-data,practice,transfer-api}*',
      async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.continue();
      },
    );
    await page.route('**/api/profile', (route) =>
      route.fulfill({ json: { ok: true, profile: null } }),
    );
    await page.route('**/api/preferences', (route) =>
      route.fulfill({ json: { ok: true, weeklyGoal: 5 } }),
    );
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const url =
      screen === 'landing'
        ? '/?delay=5000'
        : screen === 'login'
          ? '/login?delay=5000'
          : screen === 'connection'
            ? '/dev/preview/connection/slow'
            : `/dev/preview/${screen}?delay=5000`;
    await page.goto(url, { waitUntil: 'commit' });
    const skeleton = page.locator(`[data-ui="${layout}-skeleton"]`);
    await expect(skeleton).toBeVisible();
    await expect(page.getByRole('status')).toHaveText('Loading your page…');
    await expect(skeleton.getByRole('button')).toHaveCount(0);
    await expect(skeleton.getByRole('textbox')).toHaveCount(0);
    const shapes = skeleton.locator('.MuiSkeleton-root');
    expect(await shapes.count()).toBeGreaterThan(0);
    await expect(shapes.first()).toHaveClass(/MuiSkeleton-wave/);
    expect(
      await skeleton.evaluate(
        (element) =>
          element
            .getAnimations({ subtree: true })
            .filter((animation) => animation.playState === 'running').length,
      ),
    ).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    let before: Awaited<ReturnType<typeof panelBounds>> = [];
    await expect
      .poll(async () => {
        before = await settledPanelBounds(skeleton);
        return before.length;
      })
      .toBeGreaterThan(screen === 'connection' ? -1 : 0);
    releaseHydration();
    await page.screenshot({ path: info.outputPath('skeleton.png'), fullPage: true });
    const canvas = skeleton.locator('[data-ui="writing-canvas-skeleton"]');
    const canvasHeight = screen === 'live-write' ? (await canvas.boundingBox())!.height : null;
    await expect(skeleton).toHaveCount(0, { timeout: 15000 });
    await expect(page.locator('[data-ui="loading-content"]')).toHaveCount(0, { timeout: 15000 });
    if (canvasHeight !== null) {
      const editor = page.getByRole('textbox', { name: 'Your writing', exact: true });
      await expect(editor).toBeVisible();
      expect((await editor.boundingBox())!.height).toBeCloseTo(canvasHeight, 0);
    }
    await page.screenshot({ path: info.outputPath('loaded.png'), fullPage: true });
    const after = await settledPanelBounds(page.getByRole('main'));
    if (
      ['landing', 'login', 'placement', 'onboarding', 'settings', 'live-write'].includes(screen)
    ) {
      expect(before.length).toBeGreaterThan(0);
      expect(after.length).toBeGreaterThan(0);
      for (const dimension of ['x', 'y', 'width', 'height'] as const) {
        expect(
          Math.abs(before[0][dimension] - after[0][dimension]),
          `${screen} first panel ${dimension}`,
        ).toBeLessThanOrEqual(1);
      }
    }
    const frames = await page.evaluate(() => window.loadingAudit);
    expect(frames.seen).toBe(true);
    expect(frames.samples).toBeGreaterThan(1);
    expect(frames.blankFrames).toBe(0);
    await writeFile(
      info.outputPath('layout.json'),
      JSON.stringify({ screen, before, after, frames }, null, 2),
    );
    expect(errors).toEqual([]);
  });
}
