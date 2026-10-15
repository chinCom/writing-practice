import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const directory = 'docs/verification/ux';
await mkdir(directory + '/screenshots', { recursive: true });
const core = JSON.parse(await readFile('curriculum/course.draft.json', 'utf8'));
const ielts = JSON.parse(await readFile('curriculum/ielts.draft.json', 'utf8'));
const all = [...core, ...ielts].flatMap((unit) => unit.lessons);
const first = ielts[0].lessons[0];
const index = all.findIndex((lesson) => lesson.id === first.id);
const browser = await chromium.launch();
const results = [];
try {
  for (const config of [
    { name: 'desktop', viewport: { width: 1440, height: 1000 } },
    { name: 'mobile', viewport: { width: 390, height: 844 } },
    {
      name: 'vietnamese-dark-mobile',
      viewport: { width: 390, height: 844 },
      locale: 'vi',
      dark: true,
    },
  ]) {
    const context = await browser.newContext({ viewport: config.viewport });
    if (config.locale)
      await context.addCookies([
        { name: 'locale', value: config.locale, url: 'http://127.0.0.1:3000' },
      ]);
    if (config.dark) await context.addInitScript(() => localStorage.setItem('mui-mode', 'dark'));
    await context.addCookies([
      {
        name: 'course-preview',
        domain: '127.0.0.1',
        path: '/dev/preview',
        value: JSON.stringify({
          warmups: Object.fromEntries(first.warmups.map((_, i) => [index + ':' + i, true])),
          written: [],
        }),
      },
    ]);
    const page = await context.newPage();
    for (const [screen, route] of Object.entries({
      path: 'path?course=full&track=ielts',
      lesson: 'lesson?course=full&lesson=' + first.id,
      studio: 'curriculum-write?course=full&task=' + first.task.id,
      feedback: 'course-feedback?task=' + first.task.id,
    })) {
      await page.goto('http://127.0.0.1:3000/dev/preview/' + route);
      await page.getByRole('heading', { level: 1 }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: directory + '/screenshots/ielts-' + screen + '-' + config.name + '.png',
        animations: 'disabled',
      });
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const scan = await page.evaluate(() =>
        window.axe.run({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }),
      );
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
    directory + '/curriculum-tracks-accessibility.json',
    JSON.stringify(results, null, 2) + '\n',
  );
  if (results.some((result) => result.violations.length || result.overflow)) process.exitCode = 1;
} finally {
  await browser.close();
}
