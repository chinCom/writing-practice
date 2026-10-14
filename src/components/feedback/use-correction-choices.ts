'use client';
import { useEffect, useRef, useState } from 'react';
import type { CorrectionChoice, CorrectionStatus, ReportReason } from '@/lib/feedback/choices';

type Change = { correctionIndex: number } & (
  { status: CorrectionStatus } | { reason: ReportReason }
);
function updateChoice(current: CorrectionChoice[], change: Change) {
  const previous = current.find((item) => item.correctionIndex === change.correctionIndex) ?? {
    correctionIndex: change.correctionIndex,
    status: 'open' as const,
    reason: null,
  };
  return [
    ...current.filter((item) => item.correctionIndex !== change.correctionIndex),
    { ...previous, ...change },
  ];
}
export function useCorrectionChoices(
  submissionId: string,
  preview: boolean,
  initialChoices?: CorrectionChoice[],
) {
  const [choices, setChoices] = useState(initialChoices ?? []);
  const [loading, setLoading] = useState(initialChoices === undefined);
  const [loadError, setLoadError] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [errors, setErrors] = useState<{ change: Change; code: string }[]>([]);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
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
          setLoadError(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoadError(true);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [endpoint, submissionId, initialChoices, loadVersion]);
  function reload() {
    setLoading(true);
    setLoadError(false);
    setLoadVersion((current) => current + 1);
  }
  function save(change: Change): Promise<boolean> {
    if (loading || loadError) return Promise.resolve(false);
    // Text changes are local; only persistence waits for earlier writes.
    if ('status' in change) setChoices((current) => updateChoice(current, change));
    setPendingCount((count) => count + 1);
    const work = queue.current.then(async () => {
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
        if ('reason' in change) setChoices((current) => updateChoice(current, change));
        setErrors((current) => current.filter((item) => !sameField(item.change, change)));
        return true;
      } catch (cause) {
        setErrors((current) => [
          ...current.filter((item) => !sameField(item.change, change)),
          { change, code: cause instanceof Error ? cause.message : 'SAVE_FAILED' },
        ]);
        return false;
      } finally {
        setPendingCount((count) => count - 1);
      }
    });
    queue.current = work;
    return work;
  }
  return {
    choices,
    loading,
    loadError,
    reload,
    pending: pendingCount > 0,
    errors,
    error: errors[0] ?? null,
    save,
  };
}
function sameField(left: Change, right: Change) {
  return left.correctionIndex === right.correctionIndex && 'status' in left === 'status' in right;
}
