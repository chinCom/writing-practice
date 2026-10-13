import { expect, test } from '@playwright/test';

const explanation = {
  why_original: 'The activity happened last weekend. Go describes the present.',
  why_suggestion: 'Went is the past form of go. It shows a finished activity.',
};
test('Explain loads one correction, keeps it for reuse and does not move the writing', async ({
  page,
}, info) => {
  let calls = 0;
  await page.route('**/dev/preview/explanation', async (route) => {
    calls++;
    expect(route.request().postDataJSON()).toEqual({ submissionId: 'preview', correctionIndex: 0 });
    await new Promise((resolve) => setTimeout(resolve, 350));
    await route.fulfill({ json: { ok: true, data: explanation } });
  });
  await page.goto('/dev/preview/feedback');
  await page.getByRole('button', { name: 'go: went', exact: true }).click();
  const detail =
    info.project.name === 'mobile'
      ? page.getByRole('dialog', { name: 'Correction details' })
      : page.getByRole('region', { name: 'Correction details' });
  await expect(page.locator('#correction-details')).toHaveCount(1);
  const scroll = await page.evaluate(() => scrollY);
  await detail.getByRole('button', { name: 'Explain', exact: true }).click();
  await expect(detail.getByRole('button', { name: 'Explaining…', exact: true })).toBeDisabled();
  await expect(detail).toContainText(explanation.why_suggestion);
  await expect(detail).toContainText('Why the original needs a change');
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
  await detail.getByRole('button', { name: 'Next correction', exact: true }).click();
  await expect(detail).not.toContainText(explanation.why_suggestion);
  await detail.getByRole('button', { name: 'Previous correction', exact: true }).click();
  await expect(detail).toContainText(explanation.why_suggestion);
  expect(calls).toBe(1);
});
test('a failed explanation preserves the correction and offers an explicit retry', async ({
  page,
}, info) => {
  let calls = 0;
  await page.route('**/dev/preview/explanation', async (route) => {
    calls++;
    await route.fulfill(
      calls === 1
        ? { status: 502, json: { ok: false, error: { code: 'EXPLANATION_TIMEOUT' } } }
        : { json: { ok: true, data: explanation } },
    );
  });
  await page.goto('/dev/preview/feedback');
  await page.getByRole('button', { name: 'go: went', exact: true }).click();
  const detail =
    info.project.name === 'mobile'
      ? page.getByRole('dialog', { name: 'Correction details' })
      : page.getByRole('region', { name: 'Correction details' });
  await detail.getByRole('button', { name: 'Explain', exact: true }).click();
  await expect(detail.getByRole('alert')).toContainText('The explanation took too long');
  await expect(detail).toContainText('Use went for a finished activity last weekend.');
  await detail.getByRole('button', { name: 'Try explanation again', exact: true }).click();
  await expect(detail).toContainText(explanation.why_suggestion);
  expect(calls).toBe(2);
});
