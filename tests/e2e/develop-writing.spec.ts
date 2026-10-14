import { expect, test } from '@playwright/test';

const guidance = {
  encouragement: 'You have introduced your visit.',
  question: 'What made the food memorable?',
  sentence_starter: 'I liked ___ because ___.',
  next_step: 'Add one detail about the food in your own words.',
  safety_flag: false,
  focus_text: 'It was good.',
};

test('short drafts get development help only on click without grading or changing the draft', async ({
  page,
}) => {
  let calls = 0;
  await page.route('**/api/development', async (route) => {
    calls++;
    expect(route.request().postDataJSON()).toEqual({
      taskId: 'weekend',
      text: 'I went to a restaurant. It was good.',
    });
    await route.fulfill({ json: { ok: true, data: guidance, mock: false } });
  });
  await page.goto('/dev/preview/live-write');
  const writing = page.getByRole('textbox', { name: 'Your writing' });
  const help = page.getByRole('button', { name: 'Help me develop this', exact: true });
  await expect(help).toBeDisabled();
  await writing.fill('I went to a restaurant. It was good.');
  await expect(page.getByRole('button', { name: 'Check my writing', exact: true })).toBeDisabled();
  await expect(help).toBeEnabled();
  expect(calls).toBe(0);
  await help.click();
  const panel = page.getByRole('region', { name: 'Develop your ideas' });
  await expect(panel).toContainText(guidance.question);
  await expect(panel).toContainText(guidance.sentence_starter);
  await expect(panel).toContainText(guidance.next_step);
  await expect(writing).toHaveValue('I went to a restaurant. It was good.');
  await writing.fill('I liked the noodles.');
  await expect(panel).not.toContainText(guidance.question);
  expect(calls).toBe(1);
});

test('development guidance sits with the task and points to exact writing without changing it', async ({
  page,
}, testInfo) => {
  await page.route('**/api/development', (route) =>
    route.fulfill({ json: { ok: true, data: guidance } }),
  );
  await page.goto('/dev/preview/live-write');
  const text = 'I went to a restaurant. It was good.';
  const writing = page.getByRole('textbox', { name: 'Your writing' });
  await writing.fill(text);
  await page.getByRole('button', { name: 'Help me develop this', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Develop your ideas' });
  if (testInfo.project.name === 'desktop') {
    const box = await panel.boundingBox();
    const editor = await writing.boundingBox();
    expect(box!.x + box!.width).toBeLessThan(editor!.x);
  }
  await panel.getByRole('button', { name: 'Show in my writing: It was good.' }).click();
  await expect(writing).toBeFocused();
  expect(
    await writing.evaluate((element: HTMLTextAreaElement) =>
      element.value.slice(element.selectionStart, element.selectionEnd),
    ),
  ).toBe('It was good.');
  await expect(writing).toHaveValue(text);
  await writing.fill('Something different.');
  await expect(panel.getByRole('button', { name: 'Show in my writing: It was good.' })).toHaveCount(
    0,
  );
});

test('failed development help preserves writing and retries only when pressed', async ({
  page,
}) => {
  let calls = 0;
  await page.route('**/api/development', async (route) => {
    calls++;
    await route.fulfill(
      calls === 1
        ? { status: 502, json: { ok: false, error: { code: 'DEVELOPMENT_UNAVAILABLE' } } }
        : { json: { ok: true, data: guidance, mock: false } },
    );
  });
  await page.goto('/dev/preview/live-write');
  const writing = page.getByRole('textbox', { name: 'Your writing' });
  await writing.fill('The food was good.');
  await page.getByRole('button', { name: 'Help me develop this', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Develop your ideas' })).toContainText(
    'Your writing is still here',
  );
  await expect(writing).toHaveValue('The food was good.');
  expect(calls).toBe(1);
  await page.getByRole('button', { name: 'Help me develop this', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Develop your ideas' })).toContainText(
    guidance.question,
  );
  expect(calls).toBe(2);
});

test('editing during a pending request hides old guidance and prevents duplicate calls', async ({
  page,
}) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/development', async (route) => {
    await held;
    await route.fulfill({ json: { ok: true, data: guidance, mock: false } });
  });
  await page.goto('/dev/preview/live-write');
  const writing = page.getByRole('textbox', { name: 'Your writing' });
  const help = page.getByRole('button', { name: 'Help me develop this', exact: true });
  await writing.fill('The food was good.');
  await help.click();
  await expect(page.getByRole('button', { name: 'Thinking about your ideas…' })).toBeDisabled();
  await expect(writing).toBeEnabled();
  await writing.fill('I walked home.');
  release();
  await expect(help).toBeEnabled();
  await expect(page.getByRole('region', { name: 'Develop your ideas' })).not.toContainText(
    guidance.question,
  );
  await expect(writing).toHaveValue('I walked home.');
});

test('safety responses suppress development fields and limit failures preserve writing', async ({
  page,
}) => {
  let calls = 0;
  await page.route('**/api/development', async (route) => {
    calls++;
    await route.fulfill(
      calls === 1
        ? { json: { ok: true, data: { ...guidance, safety_flag: true } } }
        : { status: 429, json: { ok: false } },
    );
  });
  await page.goto('/dev/preview/live-write');
  const writing = page.getByRole('textbox', { name: 'Your writing' });
  await writing.fill('The food was good.');
  const help = page.getByRole('button', { name: 'Help me develop this', exact: true });
  await help.click();
  const panel = page.getByRole('region', { name: 'Develop your ideas' });
  await expect(panel).toContainText('Your wellbeing comes first');
  await expect(panel).not.toContainText(guidance.question);
  await help.click();
  await expect(panel).toContainText('shared daily limit');
  await expect(writing).toHaveValue('The food was good.');
});

test('the other editor also requests guidance only on click', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/development', async (route) => {
    calls++;
    await route.fulfill({ json: { ok: true, data: guidance } });
  });
  await page.goto('/dev/preview/write');
  await page.getByRole('textbox', { name: 'Your writing' }).fill('A short start.');
  expect(calls).toBe(0);
  await page.getByRole('button', { name: 'Help me develop this', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Develop your ideas' });
  await expect(panel).toContainText(guidance.question);
  await expect(panel.getByRole('button', { name: 'Show in my writing: It was good.' })).toHaveCount(
    0,
  );
  expect(calls).toBe(1);
});

test('the other editor selects the linked passage, including leading spaces', async ({ page }) => {
  await page.route('**/api/development', (route) =>
    route.fulfill({ json: { ok: true, data: guidance } }),
  );
  await page.goto('/dev/preview/write');
  const writing = page.getByRole('textbox', { name: 'Your writing' });
  const text = '  I went to a restaurant. It was good.';
  await writing.fill(text);
  await page.getByRole('button', { name: 'Help me develop this', exact: true }).click();
  await page.getByRole('button', { name: 'Show in my writing: It was good.' }).click();
  await expect(writing).toBeFocused();
  expect(
    await writing.evaluate((element: HTMLTextAreaElement) =>
      element.value.slice(element.selectionStart, element.selectionEnd),
    ),
  ).toBe('It was good.');
  await expect(writing).toHaveValue(text);
});
