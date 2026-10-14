'use client';
import { useEffect, useRef, useState } from 'react';
import type { CorrectionChoice, CorrectionStatus, ReportReason } from '@/lib/feedback/choices';

type Change = { correctionIndex: number } & (
  { status: CorrectionStatus } | { reason: ReportReason }
);
export function useCorrectionChoices(
  submissionId: string,
  preview: boolean,
  initialChoices?: CorrectionChoice[],
) {
  const [choices, setChoices] = useState(initialChoices ?? []);
  const [loading, setLoading] = useState(initialChoices === undefined);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ change: Change; code: string } | null>(null);
  const busy = useRef(false);
  const endpoint = preview ? '/dev/preview/corrections' : '/api/corrections';
  useEffect(() => {
    if (initialChoices !== undefined) return;
    const controller = new AbortController();
    void fetch(endpoint + '?submissionId=' + submissionId, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error('LOAD_FAILED');
        if (!controller.signal.aborted) {
          setChoices(result.choices);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [endpoint, submissionId, initialChoices]);
  async function save(change: Change): Promise<boolean> {
    if (busy.current || loading) return false;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        'reason' in change ? endpoint + (preview ? '?report=true' : '/report') : endpoint,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ submissionId, ...change }),
          signal: AbortSignal.timeout(10000),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error?.code ?? 'SAVE_FAILED');
      setChoices((current) => {
        const previous = current.find(
          (item) => item.correctionIndex === change.correctionIndex,
        ) ?? { correctionIndex: change.correctionIndex, status: 'open' as const, reason: null };
        const updated = { ...previous, ...change };
        return [
          ...current.filter((item) => item.correctionIndex !== change.correctionIndex),
          updated,
        ];
      });
      return true;
    } catch (cause) {
      setError({ change, code: cause instanceof Error ? cause.message : 'SAVE_FAILED' });
      return false;
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return { choices, loading, pending, error, save };
}
