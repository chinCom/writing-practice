'use client';
import { useEffect, useRef, useState } from 'react';
import { fetchWithStatus } from '@/lib/network-status';
import type { PracticeAnswer, PracticeQuestion } from '@/lib/practice';

export function usePracticeSession(preview: boolean) {
  const endpoint = preview ? '/dev/preview/practice' : '/api/practice';
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [nextReviewAt, setNextReviewAt] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<PracticeAnswer | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<'loadError' | 'saveError' | 'session' | 'conflict' | null>(
    null,
  );
  const [reload, setReload] = useState(0);
  const [finishedBatch, setFinishedBatch] = useState(false);
  const [pending, setPending] = useState<{
    drillId: string;
    answer: string;
    version: number;
  } | null>(null);
  const checking = useRef(false);
  const answerInput = useRef<HTMLInputElement>(null);
  const question = questions[index];

  useEffect(() => {
    const controller = new AbortController();
    fetchWithStatus(endpoint, {
      cache: 'no-store',
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
    })
      .then(async (response) => {
        if (response.status === 401) throw new Error('session');
        if (!response.ok) throw new Error('loadError');
        const data = await response.json();
        if (!data.ok || !Array.isArray(data.questions)) throw new Error('loadError');
        if (controller.signal.aborted) return;
        setQuestions(data.questions);
        setNextReviewAt(data.nextReviewAt);
        setIndex(0);
        setResult(null);
        setPending(null);
        setAnswer('');
        setError(null);
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(failure.message === 'session' ? 'session' : 'loadError');
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [endpoint, reload]);

  async function check() {
    if (!question || checking.current || result?.complete || !answer.trim()) return;
    // A failed save must retry the identical answer/version rather than create a new attempt.
    const body = pending ?? {
      drillId: question.id,
      answer: answer.trim(),
      version: result?.version ?? question.version,
    };
    checking.current = true;
    setPending(body);
    setBusy(true);
    setError(null);
    try {
      const response = await fetchWithStatus(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });
      if (response.status === 401) throw new Error('session');
      if (response.status === 409 || response.status === 404) throw new Error('conflict');
      if (!response.ok) throw new Error('saveError');
      const data = await response.json();
      if (!data.ok || !data.result) throw new Error('saveError');
      setResult(data.result);
      setPending(null);
      if (!data.result.complete) requestAnimationFrame(() => answerInput.current?.focus());
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : '';
      setError(
        message === 'session' ? 'session' : message === 'conflict' ? 'conflict' : 'saveError',
      );
    } finally {
      checking.current = false;
      setBusy(false);
    }
  }
  function refresh() {
    setBusy(true);
    setReload(reload + 1);
  }
  function next() {
    if (index + 1 === questions.length) {
      setFinishedBatch(true);
      refresh();
      return;
    }
    setIndex(index + 1);
    setAnswer('');
    setResult(null);
    requestAnimationFrame(() => answerInput.current?.focus());
  }

  return {
    questions,
    nextReviewAt,
    index,
    answer,
    setAnswer,
    result,
    busy,
    error,
    finishedBatch,
    pending,
    answerInput,
    question,
    check,
    next,
    refresh,
  };
}
