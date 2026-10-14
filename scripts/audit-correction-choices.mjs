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
    await page.goto('http://127.0.0.1:3000/dev/preview/feedback');
    await page.getByRole('button', { name: 'go: went', exact: true }).click();
    await page.evaluate(() => document.fonts.ready);
    await page
      .getByRole('button', {
        name: configuration.locale ? 'Báo cáo chỉnh sửa' : 'Report correction',
        exact: true,
      })
      .waitFor();
    await page
      .getByRole('button', { name: configuration.locale ? 'Áp dụng' : 'Apply fix', exact: true })
      .waitFor();
    await page
      .getByRole('button', { name: configuration.locale ? 'Áp dụng' : 'Apply fix', exact: true })
      .isEnabled()
      .then(async (enabled) => {
        if (!enabled) {
          await page.waitForFunction(() =>
            [...document.querySelectorAll('button')].some(
              (button) =>
                /^(Apply fix|Áp dụng)$/.test(button.textContent.trim()) && !button.disabled,
            ),
          );
        }
      });
    if (configuration.name !== 'desktop') await page.getByRole('dialog').waitFor();
    await page.screenshot({
      path: directory + '/screenshots/correction-choices-' + configuration.name + '.png',
      fullPage: configuration.name === 'desktop',
      animations: 'disabled',
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
    await scan('correction');
    await page
      .getByRole('button', {
        name: configuration.locale ? 'Báo cáo chỉnh sửa' : 'Report correction',
        exact: true,
      })
      .click();
    await page.getByRole('radio').first().waitFor();
    await page.screenshot({
      path: directory + '/screenshots/correction-report-' + configuration.name + '.png',
      animations: 'disabled',
    });
    await scan('report');
    await context.close();
  }
  await writeFile(
    directory + '/correction-choices-accessibility.json',
    JSON.stringify(results, null, 2) + '\n',
  );
  if (results.some((result) => result.violations.length)) process.exitCode = 1;
} finally {
  await browser.close();
}
