import { expect, test } from '@playwright/test';

for (const screen of ['write', 'live-write']) {
  test(`${screen} puts the premise above the editor`, async ({ page }) => {
    await page.goto('/dev/preview/' + screen);
    const premise = page.getByRole('heading', { name: 'A message to a friend', exact: true });
    const editor = page.getByRole('textbox', { name: 'Your writing' });
    await expect(editor).toBeVisible();
    const taskBox = await premise.boundingBox();
    const editorBox = await editor.boundingBox();
    expect(taskBox!.y).toBeLessThan(editorBox!.y);
    expect(Math.abs(taskBox!.x - editorBox!.x)).toBeLessThan(50);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: test.info().outputPath('stacked-studio.png'), fullPage: true });
  });
}

test('desktop sidebar can hide and reopen without losing writing', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Mobile already uses a dismissible menu');
  await page.goto('/dev/preview/live-write');
  const editor = page.getByRole('textbox', { name: 'Your writing' });
  await editor.fill('Keep this draft while I focus on writing.');
  await page.getByRole('button', { name: 'Close menu', exact: true }).click();
  await expect(page.getByRole('complementary')).toBeHidden();
  await expect(page.getByRole('main')).toHaveCSS('margin-left', '0px');
  await expect(editor).toHaveValue('Keep this draft while I focus on writing.');
  const reopen = page.getByRole('button', { name: 'Open menu', exact: true });
  await expect(reopen).toBeFocused();
  await reopen.click();
  await expect(page.getByRole('complementary')).toBeVisible();
  await expect(editor).toHaveValue('Keep this draft while I focus on writing.');
  await page.screenshot({ path: test.info().outputPath('sidebar-restored.png'), fullPage: true });
});
