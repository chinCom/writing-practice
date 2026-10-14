import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const artifactDirectory = 'docs/verification/ux/screenshots';
const browser = await chromium.launch({ headless: true });
const results = [];
await mkdir(artifactDirectory, { recursive: true });
try {
  for (const configuration of [
    { name: 'desktop', viewport: { width: 1440, height: 1000 } },
    { name: 'mobile', viewport: { width: 390, height: 844 } },
    { name: 'dark-vietnamese-desktop', viewport: { width: 1440, height: 1000 }, vietnamese: true },
  ]) {
    const context = await browser.newContext({ viewport: configuration.viewport });
    if (configuration.vietnamese) {
      await context.addCookies([{ name: 'locale', value: 'vi', url: 'http://127.0.0.1:3000' }]);
      await context.addInitScript(() => localStorage.setItem('mui-mode', 'dark'));
    }
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:3000/dev/preview/feedback-many');
    await page.evaluate(() => document.fonts.ready);
    if (configuration.name !== 'mobile') {
      await page.locator('[data-connector]').first().waitFor({ state: 'attached' });
    }
    await page.screenshot({
      path: `${artifactDirectory}/marked-page-${configuration.name}.png`,
      fullPage: true,
    });
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    async function scan(state) {
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
    await scan('page');
    if (configuration.name === 'mobile') {
      await page.getByRole('button', { name: 'Review corrections', exact: true }).click();
      await page.getByRole('dialog', { name: 'Correction details' }).waitFor();
      await page.screenshot({
        path: `${artifactDirectory}/marked-page-mobile-sheet.png`,
        animations: 'disabled',
      });
      await scan('correction-sheet');
    }
    await context.close();
  }
  await writeFile(
    'docs/verification/ux/marked-page-accessibility.json',
    JSON.stringify(results, null, 2) + '\n',
  );
  if (results.some((result) => result.violations.length)) process.exitCode = 1;
} finally {
  await browser.close();
}
