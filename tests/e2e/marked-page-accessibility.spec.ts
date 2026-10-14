import { expect, test } from '@playwright/test';

test('dark Vietnamese feedback preserves English text and usable correction navigation', async ({
  page,
  context,
}, info) => {
  await context.addCookies([{ name: 'locale', value: 'vi', url: 'http://127.0.0.1:3000' }]);
  await page.addInitScript(() => localStorage.setItem('mui-mode', 'dark'));
  await page.goto('/dev/preview/feedback-many');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await page
    .getByRole('button', { name: 'invite you come: invite you to come', exact: true })
    .click();
  const detail =
    info.project.name === 'mobile'
      ? page.getByRole('dialog', { name: 'Chi tiết chỉnh sửa' })
      : page.getByRole('region', { name: 'Chi tiết chỉnh sửa' });
  await expect(detail).toContainText('Use to come after invite you.');
  await detail.getByRole('button', { name: 'Chỗ sửa tiếp theo', exact: true }).click();
  await expect(detail).toContainText('Chỗ sửa 8 trên 8');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('later corrections remain in view on a short desktop viewport', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/dev/preview/feedback-many');
  const next = page
    .getByRole('region', { name: 'Correction details' })
    .getByRole('button', { name: 'Next correction' });
  const scroll = await page.evaluate(() => scrollY);
  for (let index = 1; index < 8; index++) {
    await expect(next).toBeInViewport();
    await next.click();
  }
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
});
