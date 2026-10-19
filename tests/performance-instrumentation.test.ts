import { afterEach, expect, it, vi } from 'vitest';
import { register } from '../src/instrumentation';
import { registerTracing } from '@/lib/observability/tracing';

vi.mock('@/lib/observability/tracing', () => ({ registerTracing: vi.fn() }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

it('keeps the tracing SDK inactive on ordinary requests with diagnostics disabled', async () => {
  vi.stubEnv('NEXT_RUNTIME', 'nodejs');
  vi.stubEnv('PERFORMANCE_LOGS', 'false');
  vi.stubEnv('OTEL_EXPORTER_OTLP_ENDPOINT', '');
  vi.stubEnv('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT', '');
  await register();
  expect(registerTracing).not.toHaveBeenCalled();
});

it('starts tracing when explicitly configured on the Node runtime', async () => {
  vi.stubEnv('NEXT_RUNTIME', 'nodejs');
  vi.stubEnv('PERFORMANCE_LOGS', 'true');
  await register();
  expect(registerTracing).toHaveBeenCalledOnce();
  vi.stubEnv('NEXT_RUNTIME', 'edge');
  await register();
  expect(registerTracing).toHaveBeenCalledOnce();
});
