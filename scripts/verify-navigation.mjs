import { firefox } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await firefox.launch();
try {
  const page = await browser.newPage();
  await page.addInitScript(() => Object.defineProperty(window, 'navigation', { value: undefined }));
  await page.goto('http://127.0.0.1:3000/dev/preview/feedback');
  await page
    .getByRole('link', { name: /^(Write|Writing Studio)$/ })
    .first()
    .click();
  await page.getByRole('checkbox', { name: 'Say where you went' }).check();
  const writing = page.getByRole('textbox', { name: 'Your writing' });
  await writing.fill('Do not lose this writing.');
  // Exercise the older-browser fallback even if Firefox adds Navigation API support.
  assert.equal(await page.evaluate(() => Boolean(window.navigation)), false);
  const warning = page.waitForEvent('dialog');
  await page.evaluate(() => history.back());
  await (await warning).dismiss();
  assert.equal(await writing.inputValue(), 'Do not lose this writing.');
  assert.match(page.url(), /\/live-write$/);
  const secondWarning = page.waitForEvent('dialog');
  await page.evaluate(() => history.back());
  await (await secondWarning).accept();
  await page.waitForURL('**/dev/preview/feedback');
  console.log(
    'Firefox Back: cancelled navigation preserves writing; accepted navigation leaves the editor.',
  );
} finally {
  await browser.close();
}
