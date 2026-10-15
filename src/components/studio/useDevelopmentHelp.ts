'use client';
import { useRef, useState } from 'react';
import { DevelopmentSchema, type Development } from '@/lib/feedback/development';
import type { CurriculumTask } from '@/lib/curriculum';
import { textLimits } from '@/lib/limits';

type Result = { snapshot: string; data?: Development; error?: string };

export function useDevelopmentHelp(text: string, task: CurriculumTask, disabled = false) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const running = useRef(false);
  const snapshot = task.id + ':' + text.trim();
  // Any edit hides old guidance, because it was written for the earlier draft.
  const shown = result?.snapshot === snapshot ? result : null;
  const canRequest =
    !disabled && !pending && !!text.trim() && text.trim().length <= textLimits[task.targetLevel];

  async function request() {
    if (running.current || !canRequest) return;
    running.current = true;
    setPending(true);
    setResult(null);
    try {
      const response = await fetch('/api/development', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, text: text.trim() }),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        const errors: Record<number, string> = { 401: 'session', 429: 'limit', 503: 'unavailable' };
        setResult({ snapshot, error: errors[response.status] ?? 'error' });
        return;
      }
      const payload = await response.json();
      const data = DevelopmentSchema.parse(payload.data);
      setResult({ snapshot, data });
    } catch {
      setResult({ snapshot, error: 'error' });
    } finally {
      running.current = false;
      setPending(false);
    }
  }

  const guidance = shown?.data && !shown.data.safety_flag ? shown.data : null;
  return { pending, shown, guidance, canRequest, request, dismiss: () => setResult(null) };
}

export type DevelopmentHelpState = ReturnType<typeof useDevelopmentHelp>;
