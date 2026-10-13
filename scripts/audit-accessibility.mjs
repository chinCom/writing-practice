import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    for (const route of ['/today', '/login', '/dev/preview/live-write', '/dev/preview/feedback']) {
      await page.goto('http://127.0.0.1:3000' + route);
      await page.evaluate(() => document.fonts.ready);
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const result = await page.evaluate(() =>
        window.axe.run({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }),
      );
      results.push({
        route,
        viewport,
        violations: result.violations,
        incomplete: result.incomplete.map(({ id, nodes }) => ({ id, nodes: nodes.length })),
      });
    }
    await page.close();
  }
  await writeFile(
    'docs/verification/backend-accessibility.json',
    JSON.stringify(results, null, 2) + '\n',
  );
  for (const result of results)
    console.info(result.route, result.viewport.width, 'violations:', result.violations.length);
  if (results.some((result) => result.violations.length)) process.exitCode = 1;
} finally {
  await browser.close();
}
