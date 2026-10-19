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

test('desktop sidebar stays flush with the viewport while writing', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Desktop sidebar only');
  await page.goto('/dev/preview/live-write');
  const editor = page.getByRole('textbox', { name: 'Your writing' });
  await editor.fill('Keep this draft while I focus on writing.');
  const sidebar = page.getByRole('complementary');
  await expect(sidebar).toBeVisible();
  await expect(sidebar.getByRole('button', { name: 'Close menu', exact: true })).toHaveCount(0);
  await expect(page.getByRole('main')).toHaveCSS('margin-left', '244px');
  const bounds = await sidebar.boundingBox();
  expect(bounds).toMatchObject({ x: 0, y: 0, height: page.viewportSize()!.height });
  await page.getByRole('main').evaluate((element) => element.scrollIntoView({ block: 'end' }));
  expect(await sidebar.boundingBox()).toEqual(bounds);
  await expect(editor).toHaveValue('Keep this draft while I focus on writing.');
  await page.screenshot({ path: test.info().outputPath('sidebar-flush.png'), fullPage: true });
});
