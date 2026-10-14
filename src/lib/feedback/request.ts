export type CoachResult =
  | { status: 'completed'; submissionId: string }
  | { status: 'pending' }
  | { status: 'failed'; code: string };
interface RequestOptions {
  requestTimeoutMs?: number;
  recoveryTimeoutMs?: number;
  pollIntervalMs?: number;
}
interface CoachResponse {
  ok: boolean;
  data?: { submissionId: string; status?: string };
  error?: { code: string };
}
async function readResult(response: Response): Promise<CoachResult> {
  if (response.status === 401) return { status: 'failed', code: 'UNAUTHENTICATED' };
  const result = (await response.json()) as CoachResponse;
  // A database deadline does not establish whether an earlier write committed.
  if (response.status === 503 && result.error?.code === 'DATABASE_TIMEOUT')
    return { status: 'pending' };
  if (!response.ok || !result.ok)
    return { status: 'failed', code: result.error?.code ?? 'COACH_UNAVAILABLE' };
  if (result.data?.status === 'failed') return { status: 'failed', code: 'COACH_UNAVAILABLE' };
  if (result.data?.submissionId && result.data.status !== 'pending')
    return { status: 'completed', submissionId: result.data.submissionId };
  return { status: 'pending' };
}
export async function recoverCoach(
  requestKey: string,
  options: RequestOptions = {},
): Promise<CoachResult> {
  const deadline = Date.now() + (options.recoveryTimeoutMs ?? 15000);
  let missing = false;
  do {
    try {
      const response = await fetch('/api/feedback?requestKey=' + encodeURIComponent(requestKey), {
        cache: 'no-store',
        signal: AbortSignal.timeout(Math.max(1, Math.min(5000, deadline - Date.now()))),
      });
      // A disconnected POST may not have reached the reservation yet. Never resubmit blindly.
      missing = response.status === 404;
      if (!missing) {
        const result = await readResult(response);
        if (result.status !== 'pending') return result;
      }
    } catch {
      missing = false;
      // A status lookup is safe to repeat. It never invokes the AI provider.
    }
    if (Date.now() >= deadline) break;
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(options.pollIntervalMs ?? 2000, deadline - Date.now())),
    );
  } while (Date.now() < deadline);
  return missing ? { status: 'failed', code: 'NOT_FOUND' } : { status: 'pending' };
}
export async function requestCoach(
  input: unknown,
  requestKey: string,
  options: RequestOptions = {},
): Promise<CoachResult> {
  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestKey },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(options.requestTimeoutMs ?? 55000),
    });
    const result = await readResult(response);
    if (result.status !== 'pending') return result;
  } catch {
    // The response may be lost after the server saved feedback. Recover by request key.
  }
  return recoverCoach(requestKey, options);
}
