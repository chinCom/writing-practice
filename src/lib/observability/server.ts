import 'server-only';
import { SpanStatusCode, trace } from '@opentelemetry/api';

const tracer = trace.getTracer('writing-performance');

/** Fixed operation names only: never attach learner text, SQL parameters, or session data. */
export function traceOperation<T>(name: string, work: () => Promise<T>): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    try {
      return await work();
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}
