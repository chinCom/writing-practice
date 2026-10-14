import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const directory = 'docs/verification/ux';
await mkdir(directory + '/screenshots', { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const configuration of [
    { name: 'desktop', viewport: { width: 1440, height: 1000 } },
    { name: 'mobile', viewport: { width: 390, height: 844 } },
    { name: 'vietnamese-mobile', viewport: { width: 390, height: 844 }, locale: 'vi', dark: true },
    {
      name: 'reduced-motion-mobile',
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
    },
  ]) {
    const context = await browser.newContext({
      viewport: configuration.viewport,
      reducedMotion: configuration.reducedMotion ?? 'no-preference',
    });
    if (configuration.locale)
      await context.addCookies([
        { name: 'locale', value: configuration.locale, url: 'http://127.0.0.1:3000' },
      ]);
    if (configuration.dark)
      await context.addInitScript(() => localStorage.setItem('mui-mode', 'dark'));
    const page = await context.newPage();
    let release;
    const pending = new Promise((resolve) => {
      release = resolve;
    });
    await page.route('**/api/feedback', async (route) => {
      await pending;
      await route.fulfill({ status: 502, json: { ok: false, error: { code: 'COACH_TIMEOUT' } } });
    });
    await page.goto('http://127.0.0.1:3000/dev/preview/live-write');
    await page.evaluate(() => document.fonts.ready);
    const input = page.locator('textarea');
    await input.fill(
      'Hi Maria! Last weekend I went to the beach with my family. The weather was warm and we swam in the sea. I ate ice cream and my brother lost his hat. Would you like to come to the beach with us next weekend?',
    );
    await page
      .getByRole('button', {
        name: configuration.locale ? 'Kiểm tra bài viết' : 'Check my writing',
        exact: true,
      })
      .click();
    if (configuration.reducedMotion !== 'reduce') {
      await page.locator('[data-sweep-band]').first().waitFor();
      await page.locator('[data-sweep-band]').evaluateAll((bands) => {
        for (const band of bands) {
          band.style.animationPlayState = 'paused';
          band.style.animationDelay = '-1200ms';
        }
      });
    }
    await input.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: directory + '/screenshots/read-sweep-' + configuration.name + '.png',
      fullPage: true,
    });
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const result = await page.evaluate(() =>
      window.axe.run({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }),
    );
    results.push({
      configuration: configuration.name,
      violations: result.violations,
      incomplete: result.incomplete.map(({ id, nodes }) => ({ id, nodes: nodes.length })),
    });
    console.info(configuration.name, 'violations:', result.violations.length);
    release();
    await input.waitFor({ state: 'visible' });
    await context.close();
  }
  await writeFile(
    directory + '/read-sweep-accessibility.json',
    JSON.stringify(results, null, 2) + '\n',
  );
  if (results.some((result) => result.violations.length)) process.exitCode = 1;
} finally {
  await browser.close();
}
