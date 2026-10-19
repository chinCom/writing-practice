import { afterEach, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/telemetry/route';
import { performanceRoute } from '@/lib/observability/routes';

vi.mock('server-only', () => ({}));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const payload = {
  id: 'v5-123-example',
  name: 'LCP',
  value: 250,
  route: '/write/[id]',
  device: 'mobile',
  navigationType: 'navigate',
};
function request(body: unknown = payload, origin = 'https://writing.example') {
  return new Request('https://writing.example/api/telemetry', {
    method: 'POST',
    headers: { origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

it('collects only allowlisted vitals when enabled, without recording cookies or IDs', async () => {
  vi.stubEnv('PERFORMANCE_TELEMETRY', 'true');
  const log = vi.spyOn(console, 'info').mockImplementation(() => {});
  const response = await POST(request());
  expect(response.status).toBe(204);
  expect(response.headers.get('Cache-Control')).toContain('no-store');
  expect(JSON.parse(log.mock.calls[0][0])).toEqual({ event: 'web_vital', ...payload });
  for (const value of [
    { ...payload, text: 'private draft' },
    { ...payload, route: '/write/private-id' },
    { ...payload, route: '/progress?user=private' },
    { ...payload, value: -1 },
  ]) {
    expect((await POST(request(value))).status).toBe(400);
  }
  expect(log).toHaveBeenCalledTimes(1);
});

it('rejects disabled collection and cross-origin or malformed requests', async () => {
  vi.stubEnv('PERFORMANCE_TELEMETRY', 'false');
  expect((await POST(request())).status).toBe(404);
  vi.stubEnv('PERFORMANCE_TELEMETRY', 'true');
  for (const origin of ['https://elsewhere.example', 'not a URL', '']) {
    expect((await POST(request(payload, origin))).status).toBe(403);
  }
});

it('normalizes dynamic and unknown URLs without leaking identifiers', () => {
  expect(performanceRoute('/feedback/private-submission?text=secret#anchor')).toBe(
    '/feedback/[id]',
  );
  expect(performanceRoute('/unknown/private')).toBe('/other');
  expect(performanceRoute('/progress?secret=value')).toBe('/progress');
});
