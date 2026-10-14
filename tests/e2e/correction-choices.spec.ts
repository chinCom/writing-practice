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

test('failed choice saving leaves the original unchanged and supports an explicit retry', async ({
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
  await expect(detail.getByRole('alert')).toContainText('Your choice could not be saved');
  await expect(page.locator('[data-marked-text]')).toContainText('Last weekend I go');
  await detail.getByRole('button', { name: 'Retry saving choice', exact: true }).click();
  await expect(page.locator('[data-marked-text]')).toContainText('Last weekend I went');
  expect(calls).toBe(2);
});
