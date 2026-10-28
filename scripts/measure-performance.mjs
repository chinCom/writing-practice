import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';

const [output = 'test-results/performance/lab.json', runCount = '3'] = process.argv.slice(2);
const vitalsSource = await readFile(
  'node_modules/next/dist/compiled/web-vitals/web-vitals.js',
  'utf8',
);
const baseURL = process.env.PERFORMANCE_BASE_URL ?? 'http://127.0.0.1:3100';
const serviceURL = 'http://127.0.0.1:4319';
const token =
  'eyJhbGciOiJIUzI1NiJ9.' +
  Buffer.from(
    JSON.stringify({
      sub: '00000000-0000-4000-8000-000000000091',
      role: 'authenticated',
      exp: 4102444800,
    }),
  ).toString('base64url') +
  '.synthetic-signature';
const cookies = new Map();
const auth = createServerClient(serviceURL, 'journey-public-key', {
  cookies: {
    getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
    setAll: (values) => values.forEach(({ name, value }) => cookies.set(name, value)),
  },
});
const { error } = await auth.auth.setSession({
  access_token: token,
  refresh_token: 'journey-refresh',
});
if (error) throw error;

function observeReactWork() {
  window.labInteractions = [];
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      window.labInteractions.push({
        name: entry.name,
        duration: entry.duration,
        inputDelay: entry.processingStart - entry.startTime,
        processingMs: entry.processingEnd - entry.processingStart,
      });
    }
  }).observe({ type: 'event', durationThreshold: 16, buffered: true });
  window.editorProfile = {
    recording: false,
    commits: 0,
    taskBriefRenders: 0,
    taskBriefMs: 0,
    renderMs: 0,
  };
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true,
    inject: () => 1,
    onCommitFiberUnmount() {},
    onCommitFiberRoot(_id, root) {
      const profile = window.editorProfile;
      if (!profile.recording) return;
      profile.commits++;
      profile.renderMs += root.current.actualDuration ?? 0;
      function visit(fiber) {
        if (!fiber) return;
        if (typeof fiber.memoizedProps?.onInsert === 'function' && fiber.flags & 1) {
          profile.taskBriefRenders++;
          profile.taskBriefMs += fiber.actualDuration ?? 0;
        }
        visit(fiber.child);
        visit(fiber.sibling);
      }
      visit(root.current);
    },
  };
}

const browser = await chromium.launch();
const results = [];
try {
  for (const device of ['desktop', 'mobile']) {
    for (let run = 0; run < Number(runCount); run++) {
      for (const route of ['/progress', '/write/weekend']) {
        const metrics = {};
        const context = await browser.newContext({
          viewport:
            device === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
          isMobile: device === 'mobile',
          reducedMotion: 'reduce',
        });
        await context.addCookies(
          [...cookies].map(([name, value]) => ({ name, value, url: baseURL })),
        );
        await context.exposeBinding('__labMetric', (_source, metric) => {
          metrics[metric.name] = metric;
        });
        await context.addInitScript({
          content: `(() => { const __dirname = '/'; const module = { exports: {} }; ${vitalsSource}
          for (const name of ['LCP', 'INP', 'CLS', 'TTFB']) {
            module.exports['on' + name](metric => window.__labMetric({name: metric.name, value: metric.value, rating: metric.rating}), {reportAllChanges: true, durationThreshold: 16});
          }
        })();`,
        });
        await context.addInitScript(observeReactWork);
        const page = await context.newPage();
        page.setDefaultTimeout(20000);
        page.setDefaultNavigationTimeout(20000);
        const cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: device === 'mobile' ? 4 : 1 });
        const apiRequests = [];
        page.on('request', (request) => {
          if (request.url().endsWith('/api/progress')) apiRequests.push(performance.now());
        });
        const started = performance.now();
        await page.goto(baseURL + route, { waitUntil: 'domcontentloaded' });
        let editorProfile;
        if (route === '/progress') {
          await page.getByRole('heading', { name: 'Your review insights', exact: true }).waitFor();
          await page.getByRole('heading', { name: 'See your writing grow', exact: true }).click();
        } else {
          const editor = page.getByRole('textbox', { name: 'Your writing', exact: true });
          await editor.fill('This is a synthetic performance measurement. ');
          await page.evaluate(() => {
            window.editorProfile.recording = true;
          });
          await editor.pressSequentially(
            'I write a short message about my weekend and invite a friend.',
            { delay: 25 },
          );
          editorProfile = await page.evaluate(() => {
            window.editorProfile.recording = false;
            return window.editorProfile;
          });
        }
        const readyMs = performance.now() - started;
        await page.evaluate(
          () =>
            new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
        );
        // Finalize observers without leaving a page protected by the unsaved-writing guard.
        await page.evaluate(() => {
          Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            get: () => 'hidden',
          });
          document.dispatchEvent(new Event('visibilitychange'));
        });
        results.push({
          device,
          run,
          route,
          readyMs,
          progressApiRequests: apiRequests.length,
          firstProgressApiStartMs: apiRequests[0] ? apiRequests[0] - started : null,
          metrics: structuredClone(metrics),
          editorProfile,
          interactions: await page.evaluate(() => window.labInteractions),
        });
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
await mkdir(new URL('.', new URL(output, 'file://' + process.cwd() + '/')), { recursive: true });
await writeFile(
  output,
  JSON.stringify(
    {
      source:
        'Local production profiling build; Chromium; synthetic auth and PGlite; not field data',
      conditions:
        'Fresh browser contexts; desktop 1x CPU; mobile viewport 4x CPU; local network; 61 typed characters',
      results,
    },
    null,
    2,
  ) + '\n',
);
console.log(`Recorded ${results.length} page runs in ${output}`);
