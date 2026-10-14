import { expect, test } from '@playwright/test';

for (const route of ['/dev/preview/write', '/dev/preview/live-write']) {
  test(
    'background help updates from the current draft without an AI request: ' + route,
    async ({ page }) => {
      const requests: string[] = [];
      page.on('request', (request) => {
        if (/\/api\/(feedback|hint)/.test(request.url())) requests.push(request.url());
      });
      await page.goto(route);
      const checklist = page.getByRole('checkbox', { name: 'Say where you went' });
      await checklist.check();
      await expect(checklist).toBeChecked();
      const writing = page.getByRole('textbox', { name: 'Your writing' });
      await writing.fill('Last weekend I go to the beach. We swimmed in the sea.');
      const panel = page.getByRole('region', { name: 'A little help' });
      if (page.viewportSize()!.width >= 1200) {
        const editorBounds = await writing.boundingBox();
        const helpBounds = await panel.boundingBox();
        expect(helpBounds!.x).toBeGreaterThan(editorBounds!.x + editorBounds!.width);
      }
      await expect(panel).toContainText('swimmed');
      await expect(panel).toContainText('swam');
      await expect(panel).toContainText('went');
      await expect(writing).toBeEnabled();
      await expect(writing).toHaveValue('Last weekend I go to the beach. We swimmed in the sea.');
      await expect(panel).toContainText('Local checks');
      const clean =
        'Hi Maria! Last weekend I went to the beach with my family. We enjoyed the sunshine and swam in the sea. We came home tired but happy. Would you like to join us on our next visit to the beach?';
      await writing.fill('We swimmed in the sea.');
      await writing.fill(clean);
      await expect(panel).toContainText('No obvious issue found');
      await expect(panel).not.toContainText('swimmed');
      await writing.fill('');
      await expect(panel).toContainText('Start writing');
      await expect(panel).not.toContainText('No obvious issue found');
      expect(requests).toEqual([]);
    },
  );
}

test('a worker failure preserves typing and shows unavailable help', async ({ page }) => {
  await page.addInitScript(() => {
    window.Worker = class {
      constructor() {
        throw new Error('Worker unavailable');
      }
    } as unknown as typeof Worker;
  });
  await page.goto('/dev/preview/live-write');
  const writing = page.getByRole('textbox', { name: 'Your writing' });
  await writing.fill('My writing stays here.');
  await expect(page.getByRole('region', { name: 'A little help' })).toContainText('unavailable');
  await expect(writing).toBeEnabled();
  await expect(writing).toHaveValue('My writing stays here.');
});

test('late worker results cannot replace feedback for newer writing', async ({ page }) => {
  await page.addInitScript(() => {
    window.Worker = class {
      onmessage?: (event: { data: unknown }) => void;
      postMessage(data: { revision: number; text: string }) {
        const old = data.text.includes('swimmed');
        if (old) document.documentElement.dataset.oldHintPosted = 'true';
        setTimeout(
          () => {
            this.onmessage?.({
              data: {
                revision: data.revision,
                hints: old ? [{ kind: 'verb', original: 'swimmed', suggestion: 'swam' }] : [],
              },
            });
            if (old) document.documentElement.dataset.oldHintReturned = 'true';
          },
          old ? 1500 : 10,
        );
      }
      terminate() {}
    } as unknown as typeof Worker;
  });
  await page.goto('/dev/preview/live-write');
  const writing = page.getByRole('textbox', { name: 'Your writing' });
  await writing.fill('We swimmed in the sea.');
  await expect(page.locator('html')).toHaveAttribute('data-old-hint-posted', 'true');
  await writing.fill('We swam in the sea.');
  const panel = page.getByRole('region', { name: 'A little help' });
  await expect(panel).toContainText('No obvious issue found');
  await expect(page.locator('html')).toHaveAttribute('data-old-hint-returned', 'true');
  await expect(panel).not.toContainText('swimmed');
});

test('an unresponsive worker does not leave the help panel checking forever', async ({ page }) => {
  await page.addInitScript(() => {
    window.Worker = class {
      postMessage() {}
      terminate() {}
    } as unknown as typeof Worker;
  });
  await page.goto('/dev/preview/live-write');
  const writing = page.getByRole('textbox', { name: 'Your writing' });
  await writing.fill('My writing stays here.');
  await expect(page.getByRole('region', { name: 'A little help' })).toContainText('unavailable', {
    timeout: 8000,
  });
  await expect(writing).toHaveValue('My writing stays here.');
});
