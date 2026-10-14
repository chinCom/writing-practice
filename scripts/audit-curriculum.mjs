import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const root = 'docs/verification/ux';
await mkdir(root + '/screenshots', { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const config of [
    { name: 'desktop', viewport: { width: 1440, height: 1000 } },
    { name: 'mobile', viewport: { width: 390, height: 844 } },
    { name: 'vietnamese-mobile', viewport: { width: 390, height: 844 }, locale: 'vi' },
  ]) {
    const context = await browser.newContext({ viewport: config.viewport });
    if (config.locale)
      await context.addCookies([
        { name: 'locale', value: config.locale, url: 'http://127.0.0.1:3000' },
      ]);
    const page = await context.newPage();
    for (const screen of ['placement', 'path', 'lesson']) {
      await page.goto('http://127.0.0.1:3000/dev/preview/' + screen);
      await page.getByRole('heading', { level: 1 }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: root + '/screenshots/curriculum-' + screen + '-' + config.name + '.png',
        fullPage: true,
        animations: 'disabled',
      });
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const scan = await page.evaluate(() =>
        window.axe.run({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }),
      );
      results.push({
        screen,
        configuration: config.name,
        violations: scan.violations,
        incomplete: scan.incomplete.map(({ id, nodes }) => ({ id, nodes: nodes.length })),
      });
      console.log(screen, config.name, scan.violations.length);
    }
    await context.close();
  }
  await writeFile(root + '/curriculum-accessibility.json', JSON.stringify(results, null, 2) + '\n');
  if (results.some((result) => result.violations.length)) process.exitCode = 1;
} finally {
  await browser.close();
}
