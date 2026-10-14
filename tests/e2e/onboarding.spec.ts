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
    });
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Native language' })).toHaveText('Vietnamese');
    await expect(page.getByRole('combobox', { name: 'Starting level' })).toHaveText('A1');
    await expect(
      page.getByText('Your starting level is self-reported. This is not a placement test.'),
    ).toBeVisible();
  });
}
