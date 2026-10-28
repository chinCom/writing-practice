import { expect, test } from '@playwright/test';

const explanation = {
  why_original: 'Use a past form for a finished activity.',
  why_suggestion: 'Went is the past form of go.',
};

async function openCorrection(page: import('@playwright/test').Page, mobile: boolean) {
  await page.goto('/dev/preview/feedback');
  await page.getByRole('button', { name: 'go: went', exact: true }).click();
  return page.getByRole(mobile ? 'dialog' : 'region', { name: 'Correction details' });
}

test('an explanation preserves keyboard focus and can be hidden and reopened without another request', async ({
  page,
}, info) => {
  let calls = 0;
  await page.route('**/dev/preview/explanation', (route) => {
    calls++;
    return route.fulfill({ json: { ok: true, data: explanation } });
  });
  const detail = await openCorrection(page, info.project.name === 'mobile');
  const explain = detail.getByRole('button', { name: 'Explain', exact: true });
  await explain.focus();
  await page.keyboard.press('Enter');
  await expect(detail.getByRole('region', { name: 'Explain', exact: true })).toBeVisible();
  const hide = detail.getByRole('button', { name: 'Hide explanation', exact: true });
  await expect(hide).toBeFocused();
  await expect(hide).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Enter');
  await expect(detail.getByRole('region', { name: 'Explain', exact: true })).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(detail).toContainText(explanation.why_suggestion);
  expect(calls).toBe(1);
});

test('trying a correction focuses its input and Escape returns to the disclosure button', async ({
  page,
}, info) => {
  const detail = await openCorrection(page, info.project.name === 'mobile');
  const toggle = detail.getByRole('button', { name: 'Try it yourself', exact: true });
  await expect(toggle).toBeEnabled();
  await toggle.focus();
  await page.keyboard.press('Enter');
  const answer = detail.getByRole('textbox', { name: 'Your correction', exact: true });
  await expect(answer).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await answer.fill('wrong');
  await page.keyboard.press('Enter');
  await expect(answer).toHaveAttribute('aria-invalid', 'true');
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(detail).toBeVisible();
});

test('long explanations can be scrolled with the keyboard', async ({ page }, info) => {
  await page.setViewportSize({ width: info.project.name === 'mobile' ? 360 : 1280, height: 600 });
  await page.route('**/dev/preview/explanation', (route) =>
    route.fulfill({
      json: {
        ok: true,
        data: {
          why_original: 'Use a past form for a finished activity. '.repeat(10),
          why_suggestion: 'Went is the past form of go. '.repeat(10),
        },
      },
    }),
  );
  const detail = await openCorrection(page, info.project.name === 'mobile');
  await detail.getByRole('button', { name: 'Explain', exact: true }).click();
  const content = detail.getByRole('region', { name: 'Explain', exact: true });
  await content.focus();
  await expect(content).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
});

test('a short mobile sheet keeps close and correction navigation reachable while reading', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'mobile', 'The desktop correction panel does not use a sheet.');
  await page.setViewportSize({ width: 360, height: 520 });
  await page.route('**/dev/preview/explanation', (route) =>
    route.fulfill({
      json: {
        ok: true,
        data: {
          why_original: 'A finished action needs the past tense. '.repeat(6),
          why_suggestion: 'Went describes a completed activity in the past. '.repeat(6),
        },
      },
    }),
  );
  const detail = await openCorrection(page, true);
  await detail.getByRole('button', { name: 'Explain', exact: true }).click();
  await expect(detail).toContainText('A finished action needs the past tense.');
  const next = detail.getByRole('button', { name: 'Next correction', exact: true });
  await next.scrollIntoViewIfNeeded();
  await expect(next).toBeInViewport();
  await expect(
    detail.getByRole('button', { name: 'Close correction', exact: true }),
  ).toBeInViewport();
  await next.click();
  await expect(detail).toContainText('Correction 2 of 3');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('failed draft saves focus an actionable error and retry preserves writing', async ({
  page,
}) => {
  let saves = 0;
  await page.route('**/api/draft', (route) => {
    saves++;
    return route.fulfill(
      saves === 1 ? { status: 502, json: { ok: false } } : { json: { ok: true } },
    );
  });
  await page.goto('/dev/preview/live-write');
  const writing = page.getByRole('textbox', { name: 'Your writing', exact: true });
  const draft = 'My draft stays here after a failed save.';
  await writing.fill(draft);
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  const error = page.getByRole('alert').filter({ hasText: 'Draft could not be saved' });
  await expect(error).toBeFocused();
  await error.getByRole('button', { name: 'Retry saving draft', exact: true }).click();
  await expect(error).toHaveCount(0);
  await expect(
    page.getByRole('status').filter({ hasText: 'Draft saved to your account' }),
  ).toBeVisible();
  await expect(writing).toHaveValue(draft);
  await expect(writing).toBeFocused();
  expect(saves).toBe(2);
});
