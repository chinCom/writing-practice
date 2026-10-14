import { expect, test } from '@playwright/test';

test('saved correction choices survive reload and report reasons remain correction-specific', async ({
  page,
}, info) => {
  let status = 'open';
  let reason: string | null = null;
  await page.route('**/dev/preview/corrections*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: { ok: true, choices: [{ correctionIndex: 0, status, reason }] },
      });
    } else {
      const body = route.request().postDataJSON();
      expect(body.correctionIndex).toBe(0);
      expect(body.submissionId).toBe('preview');
      if (body.reason) reason = body.reason;
      else status = body.status;
      await route.fulfill({ json: { ok: true, status, reason } });
    }
  });
  const details = () =>
    info.project.name === 'mobile'
      ? page.getByRole('dialog', { name: 'Correction details' })
      : page.getByRole('region', { name: 'Correction details' });
  await page.goto('/dev/preview/feedback');
  await page.getByRole('button', { name: 'go: went', exact: true }).click();
  await details().getByRole('button', { name: 'Apply fix', exact: true }).click();
  await expect(page.locator('[data-marked-text]')).toContainText('Last weekend I went');
  await page.reload();
  await expect(page.locator('[data-marked-text]')).toContainText('Last weekend I went');
  await page.getByRole('button', { name: 'go: went', exact: true }).click();
  await details().getByRole('button', { name: 'Undo fix', exact: true }).click();
  await details().getByRole('button', { name: 'Dismiss suggestion', exact: true }).click();
  await expect(details()).toContainText('This suggestion is dismissed');
  await page.reload();
  await page.getByRole('button', { name: 'go: went', exact: true }).click();
  await details().getByRole('button', { name: 'Restore suggestion', exact: true }).click();
  await details().getByRole('button', { name: 'Report correction', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Report this correction' });
  await dialog.getByRole('radio', { name: 'The suggestion changes my meaning' }).check();
  await dialog.getByRole('button', { name: 'Send report', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(details()).toContainText('Report saved');
  await details().getByRole('button', { name: 'Next correction', exact: true }).click();
  await expect(details()).not.toContainText('Report saved');
  await page.reload();
  await page.getByRole('button', { name: 'go: went', exact: true }).click();
  await expect(details()).toContainText('Report saved');
});

test('failed report saving keeps the selected reason visible and allows retry', async ({
  page,
}, info) => {
  let calls = 0;
  await page.route('**/dev/preview/corrections*', async (route) => {
    if (route.request().method() === 'GET')
      return route.fulfill({ json: { ok: true, choices: [] } });
    expect(route.request().postDataJSON().reason).toBe('meaning');
    calls++;
    await route.fulfill(
      calls === 1
        ? { status: 500, json: { ok: false } }
        : { json: { ok: true, reason: 'meaning' } },
    );
  });
  await page.goto('/dev/preview/feedback');
  await page.getByRole('button', { name: 'go: went', exact: true }).click();
  const detail =
    info.project.name === 'mobile'
      ? page.getByRole('dialog', { name: 'Correction details' })
      : page.getByRole('region', { name: 'Correction details' });
  await detail.getByRole('button', { name: 'Report correction', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Report this correction' });
  await dialog.getByRole('radio', { name: 'The suggestion changes my meaning' }).check();
  await dialog.getByRole('button', { name: 'Send report', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Your report could not be saved');
  await expect(
    dialog.getByRole('radio', { name: 'The suggestion changes my meaning' }),
  ).toBeChecked();
  await dialog.getByRole('button', { name: 'Send report', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(detail).toContainText('Report saved');
});

test('failed choice saving keeps the local fix and supports an explicit retry after advancing', async ({
  page,
}, info) => {
  let calls = 0;
  await page.route('**/dev/preview/corrections*', async (route) => {
    if (route.request().method() === 'GET')
      return route.fulfill({ json: { ok: true, choices: [] } });
    calls++;
    await route.fulfill(
      calls === 1
        ? { status: 500, json: { ok: false } }
        : { json: { ok: true, status: 'applied' } },
    );
  });
  await page.goto('/dev/preview/feedback');
  await page.getByRole('button', { name: 'go: went', exact: true }).click();
  const detail =
    info.project.name === 'mobile'
      ? page.getByRole('dialog', { name: 'Correction details' })
      : page.getByRole('region', { name: 'Correction details' });
  await detail.getByRole('button', { name: 'Apply fix', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Your choice could not be saved' }),
  ).toBeVisible();
  await expect(page.locator('[data-marked-text]')).toContainText('Last weekend I went');
  await page.getByRole('button', { name: 'Retry saving choice', exact: true }).click();
  await expect(page.locator('[data-marked-text]')).toContainText('Last weekend I went');
  await expect.poll(() => calls).toBe(2);
});

test('a failed initial choice load blocks editing until retry restores saved state', async ({
  page,
}, info) => {
  let failLoad = true;
  await page.route('**/dev/preview/corrections*', async (route) => {
    if (route.request().method() !== 'GET') throw new Error('Editing must stay blocked');
    await route.fulfill(
      failLoad
        ? { status: 500, json: { ok: false } }
        : {
            json: { ok: true, choices: [{ correctionIndex: 0, status: 'applied', reason: null }] },
          },
    );
  });
  await page.goto('/dev/preview/feedback');
  await expect(page.getByRole('alert').filter({ hasText: 'could not be loaded' })).toBeVisible();
  await page.getByRole('button', { name: 'go: went', exact: true }).click();
  const detail =
    info.project.name === 'mobile'
      ? page.getByRole('dialog', { name: 'Correction details' })
      : page.getByRole('region', { name: 'Correction details' });
  await expect(detail.getByRole('button', { name: 'Apply fix', exact: true })).toBeDisabled();
  if (info.project.name === 'mobile')
    await detail.getByRole('button', { name: 'Close correction' }).click();
  failLoad = false;
  await page.getByRole('button', { name: 'Retry saving choice', exact: true }).click();
  await expect(page.locator('[data-marked-text]')).toContainText('Last weekend I went');
});

test('applies locally and advances before a delayed save without requesting AI', async ({
  page,
}, info) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let writes = 0;
  let aiCalls = 0;
  let navigationWarnings = 0;
  page.on('dialog', async (dialog) => {
    navigationWarnings++;
    await dialog.dismiss();
  });
  await page.route('**/dev/preview/corrections*', async (route) => {
    if (route.request().method() === 'GET')
      return route.fulfill({ json: { ok: true, choices: [] } });
    writes++;
    await gate;
    await route.fulfill({ json: { ok: true } });
  });
  await page.route('**/api/explanation', async (route) => {
    aiCalls++;
    await route.abort();
  });
  await page.goto('/dev/preview/feedback');
  await page.getByRole('button', { name: 'go: went', exact: true }).click();
  const detail =
    info.project.name === 'mobile'
      ? page.getByRole('dialog', { name: 'Correction details' })
      : page.getByRole('region', { name: 'Correction details' });
  await detail.getByRole('button', { name: 'Apply fix', exact: true }).click();
  await expect(page.locator('[data-marked-text]')).toContainText('Last weekend I went', {
    timeout: 1000,
  });
  await expect(detail).toContainText('Correction 2 of', { timeout: 1000 });
  await expect(detail.getByRole('button', { name: 'Apply fix', exact: true })).toBeEnabled();
  await detail.getByRole('button', { name: 'Apply fix', exact: true }).click();
  expect(writes).toBe(1);
  if (info.project.name === 'mobile')
    await detail.getByRole('button', { name: 'Close correction' }).click();
  await page.getByRole('link', { name: 'Revise your writing', exact: true }).click();
  expect(navigationWarnings).toBe(1);
  await expect(page).toHaveURL(/preview\/feedback$/);
  release();
  await expect.poll(() => writes).toBe(2);
  expect(aiCalls).toBe(0);
});
