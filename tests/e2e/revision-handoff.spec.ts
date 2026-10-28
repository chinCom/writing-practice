import { expect, test } from '@playwright/test';

test('applied fixes reach the revision editor without changing saved feedback', async ({
  page,
}, info) => {
  await page.goto('/dev/preview/feedback');
  await page.getByRole('button', { name: 'go: went', exact: true }).click();
  const detail =
    info.project.name === 'mobile'
      ? page.getByRole('dialog', { name: 'Correction details' })
      : page.getByRole('region', { name: 'Correction details' });
  const choiceSaved = page.waitForResponse(
    (response) =>
      response.url().includes('/dev/preview/corrections') && response.request().method() === 'POST',
  );
  await detail.getByRole('button', { name: 'Apply fix', exact: true }).click();
  // Wait for the ordered save to settle; an in-flight save deliberately asks before leaving.
  await choiceSaved;
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'Close correction' }).click();
  await page.getByRole('link', { name: 'Revise your writing', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Your writing' })).toHaveValue(
    /Last weekend I went/,
  );
  await page.getByRole('textbox', { name: 'Your writing' }).fill('My revision');
  page.once('dialog', (dialog) => dialog.accept());
  await page.goto('/dev/preview/feedback');
  await expect(page.locator('[data-marked-text]')).toContainText('Last weekend I go');
});
