import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const directory = 'docs/verification/ux';
const browser = await chromium.launch({ headless: true });
const results = [];
await mkdir(`${directory}/screenshots`, { recursive: true });
try {
  for (const configuration of [
    { name: 'desktop', viewport: { width: 1440, height: 1000 } },
    { name: 'mobile', viewport: { width: 390, height: 844 } },
    { name: 'vietnamese-mobile', viewport: { width: 390, height: 844 }, locale: 'vi' },
  ]) {
    const context = await browser.newContext({ viewport: configuration.viewport });
    if (configuration.locale) {
      await context.addCookies([
        { name: 'locale', value: configuration.locale, url: 'http://127.0.0.1:3000' },
      ]);
    }
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:3000/dev/preview/practice-page');
    await page.getByRole('textbox').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    for (const state of ['question', 'result']) {
      if (state === 'result') {
        await page.getByRole('textbox').fill('swam');
        await page.locator('form').getByRole('button').click();
        await page.getByRole('status').waitFor();
      }
      await page.screenshot({
        path: `${directory}/screenshots/practice-${configuration.name}-${state}.png`,
        fullPage: true,
        animations: 'disabled',
      });
      const result = await page.evaluate(() =>
        window.axe.run({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }),
      );
      results.push({
        configuration: configuration.name,
        state,
        violations: result.violations,
        incomplete: result.incomplete.map(({ id, nodes }) => ({ id, nodes: nodes.length })),
      });
      console.info(configuration.name, state, 'violations:', result.violations.length);
    }
    await context.close();
  }
  await writeFile(
    `${directory}/practice-accessibility.json`,
    JSON.stringify(results, null, 2) + '\n',
  );
  if (results.some((result) => result.violations.length)) process.exitCode = 1;
} finally {
  await browser.close();
}
