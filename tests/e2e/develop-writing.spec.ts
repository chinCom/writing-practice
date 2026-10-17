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
  const suggestion = page.getByRole('region', { name: 'Coach suggestion' });
  await expect(suggestion).toContainText(guidance.question);
  await expect(suggestion).toContainText(guidance.sentence_starter);
  await expect(panel).toContainText(guidance.next_step);
  await expect(writing).toHaveValue('I went to a restaurant. It was good.');
  await writing.fill('I liked the noodles.');
  await expect(suggestion).toHaveCount(0);
  await expect(panel).toHaveCount(0);
  expect(calls).toBe(1);
});

test('development guidance highlights the exact passage and asks its question there', async ({
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
  const suggestion = page.getByRole('region', { name: 'Coach suggestion' });
  await expect(suggestion).toContainText(guidance.question);
  if (testInfo.project.name === 'desktop') {
    const box = await panel.boundingBox();
    const editor = await writing.boundingBox();
    expect(box!.y).toBeGreaterThan(editor!.y + editor!.height);
  }
  // The highlight covers the passage: it starts after "restaurant." and ends at the text end.
  const band = page.locator('[data-focus-band]');
  await expect(band).toHaveCount(1);
  const mark = (await band.boundingBox())!;
  const passage = await writing.evaluate((element: HTMLTextAreaElement, phrase: string) => {
    const mirror = document.createElement('div');
    const style = getComputedStyle(element);
    Object.assign(mirror.style, {
      position: 'absolute',
      visibility: 'hidden',
      whiteSpace: 'pre-wrap',
      font: style.font,
      width: element.clientWidth + 'px',
    });
    mirror.textContent = element.value;
    document.body.append(mirror);
    const range = document.createRange();
    const start = element.value.indexOf(phrase);
    range.setStart(mirror.firstChild!, start);
    range.setEnd(mirror.firstChild!, start + phrase.length);
    const rect = range.getBoundingClientRect();
    const origin = mirror.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    mirror.remove();
    return { left: box.left + rect.left - origin.left, width: rect.width };
  }, guidance.focus_text);
  expect(Math.abs(mark.x - passage.left)).toBeLessThan(2);
  expect(Math.abs(mark.width - passage.width)).toBeLessThan(2);
  const bubble = (await suggestion.boundingBox())!;
  expect(bubble.y).toBeGreaterThan(mark.y + mark.height);
  await expect(writing).toHaveValue(text);
  await suggestion.getByRole('button', { name: 'Close suggestion' }).click();
  await expect(suggestion).toHaveCount(0);
  await expect(band).toHaveCount(0);
  await expect(writing).toHaveValue(text);
});

test('guidance without an exact passage points to the end of the draft', async ({ page }) => {
  await page.route('**/api/development', (route) =>
    route.fulfill({ json: { ok: true, data: { ...guidance, focus_text: '' } } }),
  );
  await page.goto('/dev/preview/live-write');
  await page.getByRole('textbox', { name: 'Your writing' }).fill('I went to a restaurant.');
  await page.getByRole('button', { name: 'Help me develop this', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Coach suggestion' })).toContainText(
    guidance.question,
  );
  await expect(page.locator('[data-focus-band]')).toHaveCount(0);
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
  await expect(page.getByRole('region', { name: 'Coach suggestion' })).toContainText(
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
  await expect(page.getByRole('region', { name: 'Coach suggestion' })).toHaveCount(0);
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
  await expect(page.getByRole('region', { name: 'Coach suggestion' })).toHaveCount(0);
  await expect(page.locator('[data-focus-band]')).toHaveCount(0);
  await help.click();
  await expect(panel).toContainText('shared daily limit');
  await expect(writing).toHaveValue('The food was good.');
});

test('the other editor also requests guidance only on click and highlights the passage', async ({
  page,
}) => {
  let calls = 0;
  await page.route('**/api/development', async (route) => {
    calls++;
    await route.fulfill({ json: { ok: true, data: guidance } });
  });
  await page.goto('/dev/preview/write');
  const writing = page.getByRole('textbox', { name: 'Your writing' });
  // The stored sample draft loads after hydration; filling earlier would be appended to it.
  await expect(writing).toHaveValue(/Hi Maria/);
  await writing.fill('');
  await writing.fill('  I went to a restaurant. It was good.');
  expect(calls).toBe(0);
  await page.getByRole('button', { name: 'Help me develop this', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Coach suggestion' })).toContainText(
    guidance.question,
  );
  await expect(page.locator('[data-focus-band]')).toHaveCount(1);
  await expect(writing).toHaveValue('  I went to a restaurant. It was good.');
  expect(calls).toBe(1);
});
