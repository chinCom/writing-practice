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
    { name: 'vietnamese-mobile', viewport: { width: 390, height: 844 }, locale: 'vi' },
  ]) {
    const context = await browser.newContext({ viewport: configuration.viewport });
    if (configuration.locale)
      await context.addCookies([
        { name: 'locale', value: configuration.locale, url: 'http://127.0.0.1:3000' },
      ]);
    const page = await context.newPage();
    await page.route('**/api/profile', (route) =>
      route.fulfill({
        json: {
          ok: true,
          profile: { nativeLanguage: 'vi', goal: 'general', startingLevel: 'A1', dailyMinutes: 15 },
        },
      }),
    );
    await page.goto('http://127.0.0.1:3000/dev/preview/onboarding');
    await page.locator('#startingLevel').filter({ hasText: 'A1' }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: directory + '/screenshots/onboarding-' + configuration.name + '.png',
      fullPage: true,
      animations: 'disabled',
    });
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const scan = await page.evaluate(() =>
      window.axe.run({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }),
    );
    results.push({
      configuration: configuration.name,
      violations: scan.violations,
      incomplete: scan.incomplete.map(({ id, nodes }) => ({ id, nodes: nodes.length })),
    });
    console.info(configuration.name, 'violations:', scan.violations.length);
    await context.close();
  }
  await writeFile(
    directory + '/onboarding-accessibility.json',
    JSON.stringify(results, null, 2) + '\n',
  );
  if (results.some((result) => result.violations.length)) process.exitCode = 1;
} finally {
  await browser.close();
}
