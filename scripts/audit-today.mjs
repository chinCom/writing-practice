import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const root = 'docs/verification/ux';
await mkdir(root + '/screenshots', { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const config of [
    { name: 'desktop', viewport: { width: 1586, height: 992 } },
    { name: 'mobile', viewport: { width: 390, height: 844 } },
    { name: 'vietnamese-mobile', viewport: { width: 390, height: 844 }, locale: 'vi' },
    { name: 'dark-mobile', viewport: { width: 390, height: 844 }, dark: true },
  ]) {
    const context = await browser.newContext({ viewport: config.viewport });
    if (config.locale)
      await context.addCookies([{ name: 'locale', value: config.locale, url: baseURL }]);
    if (config.dark) await context.addInitScript(() => localStorage.setItem('mui-mode', 'dark'));
    const page = await context.newPage();
    await page.goto(baseURL + '/dev/preview/today');
    await page.getByRole('heading', { level: 1 }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    if (config.dark) {
      const mode = await page.locator('html').getAttribute('data-mui-color-scheme');
      if (mode !== 'dark') throw new Error('Dark mode was not activated.');
    }
    await page.screenshot({
      path: root + '/screenshots/today-' + config.name + '.png',
      fullPage: config.name !== 'desktop',
      animations: 'disabled',
      style: 'nextjs-portal { visibility: hidden; }',
    });
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const scan = await page.evaluate(() => window.axe.run());
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    results.push({
      configuration: config.name,
      overflow,
      violations: scan.violations,
      incomplete: scan.incomplete.map(({ id, nodes }) => ({ id, nodes: nodes.length })),
    });
    console.log(config.name, scan.violations.length, 'violations; overflow:', overflow);
    await context.close();
  }
  await writeFile(root + '/today-accessibility.json', JSON.stringify(results, null, 2) + '\n');
  if (results.some((result) => result.violations.length || result.overflow)) process.exitCode = 1;
} finally {
  await browser.close();
}
