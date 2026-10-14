import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const directory = 'docs/verification/ux';
await mkdir(directory + '/screenshots', { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const config of [
    { name: 'desktop', viewport: { width: 1440, height: 1000 } },
    { name: 'mobile', viewport: { width: 390, height: 844 } },
    { name: 'vietnamese-dark-mobile', viewport: { width: 390, height: 844 }, locale: 'vi' },
  ]) {
    const context = await browser.newContext({ viewport: config.viewport });
    if (config.locale) {
      await context.addCookies([
        { name: 'locale', value: config.locale, url: 'http://127.0.0.1:3000' },
      ]);
      await context.addInitScript(() => localStorage.setItem('mui-mode', 'dark'));
    }
    const page = await context.newPage();
    for (const screen of ['write', 'live-write']) {
      await page.goto('http://127.0.0.1:3000/dev/preview/' + screen);
      await page
        .getByRole('textbox')
        .fill('Last weekend I go to the beach. We swimmed in the sea.');
      await page.getByRole('region').getByText(/swam/).waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: directory + '/screenshots/writing-help-' + screen + '-' + config.name + '.png',
        fullPage: true,
        animations: 'disabled',
      });
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const scan = await page.evaluate(() => window.axe.run());
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      results.push({
        screen,
        configuration: config.name,
        overflow,
        violations: scan.violations,
        incomplete: scan.incomplete.map(({ id, nodes }) => ({ id, nodes: nodes.length })),
      });
      console.log(screen, config.name, scan.violations.length, 'overflow:', overflow);
    }
    await context.close();
  }
  await writeFile(
    directory + '/writing-help-accessibility.json',
    JSON.stringify(results, null, 2) + '\n',
  );
  if (results.some((result) => result.violations.length || result.overflow)) process.exitCode = 1;
} finally {
  await browser.close();
}
