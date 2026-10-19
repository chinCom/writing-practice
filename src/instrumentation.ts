export async function register() {
  const tracingEnabled =
    process.env.PERFORMANCE_LOGS === 'true' ||
    Boolean(
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    );
  if (process.env.NEXT_RUNTIME === 'nodejs' && tracingEnabled) {
    const { registerTracing } = await import('./lib/observability/tracing');
    registerTracing();
  }
}
