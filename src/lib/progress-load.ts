import type { ProgressPageData } from './db/progress';

export type ProgressLoadResult = { ok: true; data: ProgressPageData } | { ok: false };
