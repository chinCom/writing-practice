import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const directory = 'docs/verification/ux';
await mkdir(directory + '/screenshots', { recursive: true });
const units = JSON.parse(await readFile('curriculum/course.draft.json', 'utf8'));
const lessons = units.flatMap((unit) => unit.lessons);
const advancedIndex = lessons.findIndex((lesson) => lesson.task.targetLevel === 'C1');
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
    const page = await context.newPage();
    for (const screen of ['path', 'lesson', 'advanced']) {
      if (screen === 'advanced')
        await context.addCookies([
          {
            name: 'course-preview',
            domain: '127.0.0.1',
            path: '/dev/preview',
            value: JSON.stringify({
              written: Array.from({ length: advancedIndex }, (_, i) => i),
              warmups: Object.fromEntries(
                Array.from({ length: advancedIndex + 1 }, (_, i) => [
                  [i + ':0', true],
                  [i + ':1', true],
                ]).flat(),
              ),
            }),
          },
        ]);
      const route =
        screen === 'path'
          ? 'path?course=full'
          : screen === 'lesson'
            ? 'lesson?course=full&lesson=first-words-1'
            : 'curriculum-write?course=full&task=' + lessons[advancedIndex].task.id;
      await page.goto('http://127.0.0.1:3000/dev/preview/' + route);
      await page.getByRole('heading', { level: 1 }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: directory + '/screenshots/course-' + screen + '-' + config.name + '.png',
        fullPage: screen === 'lesson',
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
    directory + '/course-accessibility.json',
    JSON.stringify(results, null, 2) + '\n',
  );
  if (results.some((result) => result.violations.length || result.overflow)) process.exitCode = 1;
} finally {
  await browser.close();
}
