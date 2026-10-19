import { registerOTel } from '@vercel/otel';
import { SimpleSpanProcessor, type SpanExporter } from '@opentelemetry/sdk-trace-base';

const logExporter: SpanExporter = {
  export(spans, complete) {
    for (const span of spans) {
      if (span.instrumentationScope.name !== 'writing-performance') continue;
      console.info(
        JSON.stringify({
          event: 'server_timing',
          operation: span.name,
          traceId: span.spanContext().traceId,
          spanId: span.spanContext().spanId,
          parentSpanId: span.parentSpanContext?.spanId,
          durationMs: span.duration[0] * 1000 + span.duration[1] / 1e6,
          status: span.status.code,
        }),
      );
    }
    complete({ code: 0 });
  },
  async shutdown() {},
};

export function registerTracing() {
  registerOTel({
    serviceName: 'writing-practice',
    // Our fixed-name spans measure auth without recording URLs, tokens, or query strings.
    instrumentations: [],
    spanProcessors:
      process.env.PERFORMANCE_LOGS === 'true'
        ? ['auto', new SimpleSpanProcessor(logExporter)]
        : ['auto'],
  });
}
