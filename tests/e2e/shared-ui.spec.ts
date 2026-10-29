import { expect, test } from '@playwright/test';

// Loading skeletons reuse SectionPanel, so count only the panels of the loaded report.
function panels(page: import('@playwright/test').Page) {
  return page.locator('[data-ui="section-panel"]:not([data-ui="loading-content"] *)');
}

test('report and Practice sections share padding, named headings and shrink-safe layout', async ({
  page,
}, info) => {
  await page.goto('/dev/preview/progress');
  await expect(panels(page)).toHaveCount(5);
  const padding = await panels(page)
    .first()
    .evaluate((element) => getComputedStyle(element).padding);
  for (const panel of await panels(page).all()) {
    const heading = panel.getByRole('heading').first();
    await expect(heading).toBeVisible();
    expect(await panel.getAttribute('aria-labelledby')).toBe(await heading.getAttribute('id'));
    expect(await panel.evaluate((element) => getComputedStyle(element).padding)).toBe(padding);
  }
  await page.screenshot({
    path: `docs/verification/shared-ui/progress-${info.project.name}.png`,
    fullPage: info.project.name === 'desktop',
  });
  await page.goto('/dev/preview/practice-page');
  await expect(panels(page)).toHaveCount(1);
  expect(
    await panels(page)
      .first()
      .evaluate((element) => getComputedStyle(element).padding),
  ).toBe(padding);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('shared icon badges keep the same small size in Settings and course summaries', async ({
  page,
}) => {
  await page.goto('/settings');
  const settings = page.locator('[data-ui="icon-badge"]').first();
  await expect(settings).toBeVisible();
  const size = await settings.evaluate((element) => getComputedStyle(element).inlineSize);
  await expect(settings).toHaveAttribute('aria-hidden', 'true');
  await page.goto('/dev/preview/progress');
  const courseBadge = page
    .locator('[data-ui="icon-badge"]')
    .filter({ has: page.locator('[data-testid="MenuBookOutlinedIcon"]') })
    .first();
  await expect(courseBadge).toBeVisible();
  expect(await courseBadge.evaluate((element) => getComputedStyle(element).inlineSize)).toBe(size);
  await expect(courseBadge).toHaveAttribute('aria-hidden', 'true');
});

test('shared error notices retain explicit keyboard retry without replaying on their own', async ({
  page,
}) => {
  let failed = true;
  let reads = 0;
  await page.route('**/dev/preview/progress-data', (route) => {
    reads++;
    return failed ? route.fulfill({ status: 503, json: { ok: false } }) : route.continue();
  });
  await page.goto('/dev/preview/progress');
  const notice = page.locator('[data-ui="action-notice"]');
  await expect(notice).toBeVisible();
  await expect(notice).toHaveAttribute('role', 'alert');
  const baseline = reads;
  const retry = notice.getByRole('button', { name: 'Retry', exact: true });
  await retry.focus();
  expect(reads).toBe(baseline);
  failed = false;
  await page.keyboard.press('Enter');
  await expect(panels(page)).toHaveCount(5);
  await expect(notice).toHaveCount(0);
  expect(reads).toBeGreaterThan(baseline);
});

test('shared Portfolio no-results state clears filters through its native action', async ({
  page,
}) => {
  await page.goto('/dev/preview/portfolio');
  const search = page.getByRole('textbox', { name: 'Search your writing', exact: true });
  await expect(page.locator('[data-ui="stat-tile"]').first()).toBeVisible();
  await search.fill('a-query-that-never-matches-any-saved-writing-98347');
  const empty = page.locator('[data-ui="empty-state"]');
  await expect(
    empty.getByRole('heading', { name: 'No saved writing matches this search.', exact: true }),
  ).toBeVisible();
  await empty.getByRole('button', { name: 'Clear search', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(search).toHaveValue('');
  await expect(empty).toHaveCount(0);
});

test('shared empty Portfolio state retains the writing destination', async ({ page }) => {
  await page.route('**/dev/preview/portfolio-data?offset=*', (route) =>
    route.fulfill({ json: { ok: true, data: { entries: [], nextOffset: null } } }),
  );
  await page.goto('/dev/preview/portfolio');
  const empty = page.locator('[data-ui="empty-state"]');
  await expect(empty.getByRole('heading', { name: 'Saved pieces', exact: true })).toBeVisible();
  await expect(empty.getByRole('link')).toHaveAttribute('href', '/write/weekend');
});

test('shared panels wrap Vietnamese content in dark mode without changing English writing direction', async ({
  page,
  context,
}, info) => {
  await context.addCookies([{ name: 'locale', value: 'vi', url: 'http://127.0.0.1:3000' }]);
  await page.addInitScript(() => localStorage.setItem('mui-mode', 'dark'));
  await page.goto('/dev/preview/progress');
  await expect(page.locator('[data-ui="loading-content"]')).toHaveCount(0);
  await expect(panels(page)).toHaveCount(5);
  for (const panel of await panels(page).all()) {
    await expect(panel).toBeVisible();
    const bounds = await panel.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 1);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `docs/verification/shared-ui/progress-vi-dark-${info.project.name}.png`,
    fullPage: info.project.name === 'desktop',
  });
  await panels(page)
    .first()
    .screenshot({
      path: `docs/verification/shared-ui/targets-vi-dark-${info.project.name}.png`,
    });
  await page.goto('/dev/preview/live-write');
  const writing = page.locator('textarea').first();
  await expect(writing).toHaveAttribute('dir', 'ltr');
  await expect(writing).toHaveAttribute('spellcheck', 'false');
});

test('shared actions keep their weight, pass-through props and client navigation', async ({
  page,
}, info) => {
  await page.goto('/dev/preview/today');
  await page.screenshot({
    path: `docs/verification/shared-ui/today-${info.project.name}.png`,
    fullPage: info.project.name === 'desktop',
  });
  const primary = page.locator('a.MuiButton-contained').first();
  await expect(primary).toBeVisible();
  await expect(primary).toHaveClass(/MuiButton-contained/);
  const href = await primary.getAttribute('href');
  expect(href).toBeTruthy();
  await page.evaluate(() => Object.assign(window, { sharedNavMarker: 'kept' }));
  await primary.click();
  await page.waitForURL((url) => url.pathname === new URL(href!, 'http://127.0.0.1:3000').pathname);
  expect(
    await page.evaluate(() => (window as never as { sharedNavMarker?: string }).sharedNavMarker),
  ).toBe('kept');
  await page.goto('/settings');
  const secondary = page.locator('a.MuiButton-outlined').first();
  await expect(secondary).toHaveClass(/MuiButton-outlined/);
});

test('shared soft chips and content skeletons preserve status and accessible labels', async ({
  page,
}) => {
  await page.route('**/dev/preview/progress-data*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.continue();
  });
  await page.goto('/dev/preview/progress');
  const loading = page.locator('[data-ui="progress-panels-skeleton"]');
  await expect(loading).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Loading progress');
  await expect(panels(page)).toHaveCount(5);
  await expect(loading).toHaveCount(0);
  const chips = page.locator('.MuiChip-root');
  await expect(chips.first()).toBeVisible();
  const classes = await chips.evaluateAll((elements) =>
    elements.map((element) => element.className),
  );
  expect(classes.some((name) => /MuiChip-colorSuccess/.test(name))).toBe(true);
  expect(classes.some((name) => /MuiChip-colorError/.test(name))).toBe(true);
  expect(classes.some((name) => /MuiChip-sizeSmall/.test(name))).toBe(true);
  await expect(chips.first()).toBeVisible();
});
