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
  ]) {
    const context = await browser.newContext({ viewport: configuration.viewport });
    if (configuration.locale)
      await context.addCookies([
        { name: 'locale', value: configuration.locale, url: 'http://127.0.0.1:3000' },
      ]);
    if (configuration.dark)
      await context.addInitScript(() => localStorage.setItem('mui-mode', 'dark'));
    const page = await context.newPage();
    for (const screen of ['portfolio', 'revision']) {
      await page.goto('http://127.0.0.1:3000/dev/preview/' + screen);
      if (screen === 'revision') await page.getByRole('table').waitFor();
      else
        await page
          .getByRole('link', { name: configuration.locale ? 'Mở phản hồi' : 'Open feedback' })
          .first()
          .waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: directory + '/screenshots/' + screen + '-' + configuration.name + '.png',
        fullPage: true,
        animations: 'disabled',
      });
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const scan = await page.evaluate(() =>
        window.axe.run({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }),
      );
      results.push({
        configuration: configuration.name,
        screen,
        violations: scan.violations,
        incomplete: scan.incomplete.map(({ id, nodes }) => ({ id, nodes: nodes.length })),
      });
      console.info(configuration.name, screen, 'violations:', scan.violations.length);
    }
    await context.close();
  }
  await writeFile(
    directory + '/portfolio-accessibility.json',
    JSON.stringify(results, null, 2) + '\n',
  );
  if (results.some((result) => result.violations.length)) process.exitCode = 1;
} finally {
  await browser.close();
}
