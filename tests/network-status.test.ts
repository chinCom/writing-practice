import { afterEach, expect, it, vi } from 'vitest';
import {
  beginLoadingNotice,
  fetchWithStatus,
  getNetworkStatus,
  withLoadingNotice,
} from '@/lib/network-status';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('warns after five seconds and clears the notice when the operation completes', async () => {
  vi.useFakeTimers();
  const finish = beginLoadingNotice();
  try {
    await vi.advanceTimersByTimeAsync(4999);
    expect(getNetworkStatus().slowRequests).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(getNetworkStatus().slowRequests).toBe(1);
  } finally {
    finish();
  }
  expect(getNetworkStatus().slowRequests).toBe(0);
  finish();
  expect(getNetworkStatus().slowRequests).toBe(0);
});

it('keeps one notice episode until every overlapping slow request finishes', async () => {
  vi.useFakeTimers();
  const first = beginLoadingNotice();
  const second = beginLoadingNotice();
  try {
    await vi.advanceTimersByTimeAsync(5000);
    const episode = getNetworkStatus().slowEpisode;
    expect(getNetworkStatus().slowRequests).toBe(2);
    first();
    expect(getNetworkStatus()).toMatchObject({ slowRequests: 1, slowEpisode: episode });
  } finally {
    first();
    second();
  }
  expect(getNetworkStatus().slowRequests).toBe(0);
});

it('preserves response identity and request options without retrying a write', async () => {
  vi.useFakeTimers();
  const response = new Response(null, { status: 503 });
  const request = vi.fn(async () => response);
  vi.stubGlobal('fetch', request);
  const options = { method: 'POST', signal: new AbortController().signal, body: 'synthetic' };
  expect(await fetchWithStatus('/api/feedback', options)).toBe(response);
  expect(request).toHaveBeenCalledExactlyOnceWith('/api/feedback', options);
  await vi.advanceTimersByTimeAsync(6000);
  expect(getNetworkStatus().slowRequests).toBe(0);
});

it('clears slow loading after cancellation and preserves the original error', async () => {
  vi.useFakeTimers();
  let fail: (reason: Error) => void = () => undefined;
  const request = new Promise<Response>((_, reject) => {
    fail = reject;
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(() => request),
  );
  const error = new DOMException('Cancelled', 'AbortError');
  const result = fetchWithStatus('/api/progress').catch((reason: unknown) => reason);
  await vi.advanceTimersByTimeAsync(5000);
  expect(getNetworkStatus().slowRequests).toBe(1);
  fail(error);
  expect(await result).toBe(error);
  expect(getNetworkStatus().slowRequests).toBe(0);
});

it('tracks the full operation while short status lookups continue', async () => {
  vi.useFakeTimers();
  const work = withLoadingNotice(async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    return 'completed';
  });
  await vi.advanceTimersByTimeAsync(5000);
  expect(getNetworkStatus().slowRequests).toBe(1);
  await vi.advanceTimersByTimeAsync(3000);
  expect(await work).toBe('completed');
  expect(getNetworkStatus().slowRequests).toBe(0);
});
