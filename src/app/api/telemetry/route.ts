import { readJson } from '@/lib/api';
import { webVitalSchema } from '@/lib/observability/web-vitals';

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store' };
  if (process.env.PERFORMANCE_TELEMETRY !== 'true')
    return new Response(null, { status: 404, headers });
  let permittedOrigin = false;
  try {
    const origin = new URL(request.headers.get('origin') ?? '');
    const destination = new URL(request.url);
    permittedOrigin =
      origin.host === (request.headers.get('host') ?? destination.host) &&
      origin.protocol === destination.protocol;
  } catch {
    // Reject missing or malformed origins without touching auth or the database.
  }
  if (!permittedOrigin) {
    return new Response(null, { status: 403, headers });
  }
  try {
    const parsed = webVitalSchema.safeParse(await readJson(request));
    if (!parsed.success) return new Response(null, { status: 400, headers });
    console.info(JSON.stringify({ event: 'web_vital', ...parsed.data }));
    return new Response(null, { status: 204, headers });
  } catch {
    return new Response(null, { status: 400, headers });
  }
}
