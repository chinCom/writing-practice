import { expect, test } from '@playwright/test';

for (const outcome of ['saved', 'failed', 'expired'] as const) {
  test(`learning profile ${outcome} preserves choices and saves only confirmed results`, async ({
    page,
  }) => {
    let profile: unknown = null;
    let retrySucceeds = false;
    await page.route('**/api/profile', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: { ok: true, profile } });
      } else if (outcome === 'saved' || retrySucceeds) {
        profile = route.request().postDataJSON();
        await route.fulfill({ json: { ok: true, profile } });
      } else {
        await route.fulfill({ status: outcome === 'expired' ? 401 : 500, json: { ok: false } });
      }
    });
    await page.goto('/dev/preview/onboarding');
    await expect(page.getByRole('heading', { name: 'Set up your writing practice' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Native language' }).click();
    await page.getByRole('option', { name: 'Vietnamese', exact: true }).click();
    await page.getByRole('combobox', { name: 'Starting level' }).click();
    await page.getByRole('option', { name: 'A1', exact: true }).click();
    await page.getByRole('button', { name: 'Save learning profile' }).click();
    if (outcome !== 'saved') {
      await expect(
        page.getByText(
          outcome === 'expired'
            ? 'Sign in again to save your learning profile.'
            : 'Your learning profile was not saved. Your choices are still here.',
        ),
      ).toBeVisible();
      await expect(page.getByRole('combobox', { name: 'Native language' })).toHaveText(
        'Vietnamese',
      );
      if (outcome === 'expired') {
        await expect(page.getByRole('link', { name: 'Sign in again' })).toBeVisible();
        return;
      }
      retrySucceeds = true;
      await page.getByRole('button', { name: 'Save learning profile' }).click();
    }
    await expect(page.getByText('Learning profile saved to your account.')).toBeVisible();
    expect(profile).toEqual({
      nativeLanguage: 'vi',
      goal: 'general',
      startingLevel: 'A1',
      dailyMinutes: 15,
      targetLevel: 'B1',
      targetScore: null,
      targetDate: null,
    });
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Native language' })).toHaveText('Vietnamese');
    await expect(page.getByRole('combobox', { name: 'Starting level' })).toHaveText('A1');
    await expect(
      page.getByText('Your starting level is self-reported. This is not a placement test.'),
    ).toBeVisible();
  });
}

test('an IELTS goal asks for a practice score and a date, and TOEFL is honest about its path', async ({
  page,
}) => {
  let profile: unknown = null;
  await page.route('**/api/profile', async (route) => {
    if (route.request().method() === 'PUT') profile = route.request().postDataJSON();
    await route.fulfill({ json: { ok: true, profile } });
  });
  await page.goto('/dev/preview/onboarding');
  await expect(page.getByRole('combobox', { name: 'Target level' })).toHaveText('B1');
  await page.getByRole('combobox', { name: 'Writing goal' }).click();
  await page.getByRole('option', { name: 'TOEFL' }).click();
  await expect(page.getByText('There are no TOEFL-specific tasks yet')).toBeVisible();
  await page.getByRole('combobox', { name: 'Writing goal' }).click();
  await page.getByRole('option', { name: 'IELTS' }).click();
  await expect(page.getByRole('combobox', { name: 'Target level' })).toHaveCount(0);
  const score = page.getByRole('combobox', { name: 'Target practice score' });
  await expect(score).toHaveText('4 out of 5');
  await expect(page.getByText('It is not an official IELTS band.')).toBeVisible();
  await score.click();
  await page.getByRole('option', { name: '4.5 out of 5' }).click();
  await page.getByLabel('Target date (optional)').fill('2027-03-15');
  await page.getByRole('button', { name: 'Save learning profile' }).click();
  await expect(page.getByText('Learning profile saved to your account.')).toBeVisible();
  expect(profile).toMatchObject({
    goal: 'ielts',
    targetLevel: null,
    targetScore: 4.5,
    targetDate: '2027-03-15',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
