import { expect, test } from '@playwright/test';

for (const outcome of ['saved', 'failed', 'expired'] as const) {
  test(`weekly goal ${outcome} keeps the account setting honest`, async ({ page }) => {
    let goal = 5;
    let retrySucceeds = false;
    await page.route('**/api/preferences', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: { ok: true, weeklyGoal: goal } });
      } else if (outcome === 'saved' || retrySucceeds) {
        goal = route.request().postDataJSON().weeklyGoal;
        await route.fulfill({ json: { ok: true, weeklyGoal: goal } });
      } else {
        await route.fulfill({ status: outcome === 'expired' ? 401 : 500, json: { ok: false } });
      }
    });
    await page.goto('/dev/preview/settings');
    const weekly = page.getByRole('combobox', { name: 'Weekly goal' });
    await expect(weekly).toBeEnabled();
    await weekly.click();
    await page.getByRole('option', { name: '3 sessions', exact: true }).click();
    if (outcome === 'saved') {
      await expect(page.getByText('Weekly goal saved to your account.')).toBeVisible();
      await expect(weekly).toHaveText('3 sessions');
      await page.reload();
      await expect(weekly).toHaveText('3 sessions');
      await page.goto('/dev/preview/today-goal');
      await expect(
        page.getByRole('img', { name: '4 sessions this week. Goal of 3 met.' }),
      ).toBeVisible();
    } else {
      await expect(weekly).toHaveText('5 sessions');
      await expect(
        page.getByText(
          outcome === 'expired'
            ? 'Sign in again to save your weekly goal.'
            : 'Your weekly goal was not saved. Try again.',
        ),
      ).toBeVisible();
      await expect(
        page.getByRole(outcome === 'expired' ? 'link' : 'button', {
          name: outcome === 'expired' ? 'Sign in again' : 'Try again',
          exact: true,
        }),
      ).toBeVisible();
      if (outcome === 'failed') {
        retrySucceeds = true;
        await page.getByRole('button', { name: 'Try again', exact: true }).click();
        await expect(weekly).toHaveText('3 sessions');
        await expect(page.getByText('Weekly goal saved to your account.')).toBeVisible();
      }
    }
  });
}

test('anonymous Settings does not claim an account goal was saved', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('combobox', { name: 'Weekly goal' })).toBeDisabled();
  await expect(page.getByText('Sign in to save a weekly goal to your account.')).toBeVisible();
});
