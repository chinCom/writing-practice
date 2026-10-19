import { beforeEach, expect, it, vi } from 'vitest';
import ProgressReport from '@/components/progress/ProgressReport';
import { ProgressContent } from '@/components/progress/Progress';
import { loadProgress } from '@/lib/db/progress';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/progress', () => ({ loadProgress: vi.fn() }));
vi.mock('@/components/progress/Progress', () => ({ ProgressContent: () => null }));
beforeEach(() => vi.resetAllMocks());

it('starts the report for the authenticated owner before the client renders and streams its data', async () => {
  const data = { words: 42 } as Awaited<ReturnType<typeof loadProgress>>;
  vi.mocked(loadProgress).mockResolvedValue(data);
  const report = ProgressReport({ userId: 'alice' });
  expect(loadProgress).toHaveBeenCalledExactlyOnceWith('alice');
  expect(report.type).toBe(ProgressContent);
  await expect(report.props.initialReport).resolves.toEqual({ ok: true, data });
});

it('provides the retry view when the initial database request fails without exposing the error', async () => {
  vi.mocked(loadProgress).mockRejectedValue(new Error('private database connection details'));
  const report = ProgressReport({ userId: 'alice' });
  expect(report.type).toBe(ProgressContent);
  await expect(report.props.initialReport).resolves.toEqual({ ok: false });
});
