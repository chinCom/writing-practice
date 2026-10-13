import { expect, test } from '@playwright/test';

test('keyboard users can move through corrections without losing focus', async ({ page }, info) => {
  await page.goto('/dev/preview/feedback-many');
  await page.getByRole('button', { name: 'Review corrections', exact: true }).click();
  const detail =
    info.project.name === 'mobile'
      ? page.getByRole('dialog', { name: 'Correction details' })
      : page.getByRole('region', { name: 'Correction details' });
  const next = detail.getByRole('button', { name: 'Next correction', exact: true });
  await next.focus();
  await page.keyboard.press('Enter');
  await expect(detail).toContainText('Correction 2 of 8');
  await expect(next).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(detail).toContainText('Correction 3 of 8');
});
