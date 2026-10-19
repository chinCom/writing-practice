import { loadProgress } from '@/lib/db/progress';
import { traceOperation } from '@/lib/observability/server';
import { ProgressContent } from './Progress';
import type { ProgressLoadResult } from '@/lib/progress-load';

export default function ProgressReport({ userId }: { userId: string }) {
  const initialReport: Promise<ProgressLoadResult> = traceOperation('progress.load', () =>
    loadProgress(userId),
  )
    .then((data) => ({ ok: true as const, data }))
    .catch(() => ({ ok: false as const }));
  return <ProgressContent initialReport={initialReport} />;
}
