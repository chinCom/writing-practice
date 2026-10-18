'use client';
import { useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { FeedbackInput } from '@/lib/feedback/input';
import { requestCoach, recoverCoach, type CoachResult } from '@/lib/feedback/request';

type WritingCheckError =
  | 'error'
  | 'unavailable'
  | 'invalidFeedback'
  | 'failedCheck'
  | 'dailyLimit'
  | 'sessionExpired'
  | 'timeout'
  | 'inProgress'
  | 'recoverable';

const checkErrors: Record<string, WritingCheckError> = {
  UNAUTHENTICATED: 'sessionExpired',
  DAILY_LIMIT: 'dailyLimit',
  COACH_TIMEOUT: 'timeout',
  COACH_UNAVAILABLE: 'unavailable',
  COACH_FAILED: 'failedCheck',
  COACH_NOT_CONFIGURED: 'unavailable',
  COACH_INVALID_RESPONSE: 'invalidFeedback',
  CHECK_IN_PROGRESS: 'inProgress',
};

type WritingCheckOptions = {
  input: FeedbackInput;
  savedText: string;
  preview: boolean;
  coursePreview: boolean;
  allowNavigation: () => void;
};

export function useWritingCheck({
  input,
  savedText,
  preview,
  coursePreview,
  allowNavigation,
}: WritingCheckOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('liveStudio');
  const recoveryStorageKey = 'coach-check:' + pathname + (coursePreview ? ':' + input.taskId : '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<WritingCheckError | null>(null);
  const running = useRef(false);
  const requestKey = useRef<string | null>(null);
  const submittedText = useRef<string | null>(null);

  function rememberCheck(value: string | null) {
    requestKey.current = value;
    try {
      if (value) sessionStorage.setItem(recoveryStorageKey, value);
      else sessionStorage.removeItem(recoveryStorageKey);
    } catch {
      // Browser storage can be blocked. In-memory recovery remains available.
    }
  }

  function handleResult(result: CoachResult) {
    if (result.status === 'completed') {
      if (
        input.text !== savedText &&
        input.text !== submittedText.current &&
        !window.confirm(t('leaveWarning'))
      ) {
        setError('recoverable');
        return;
      }
      rememberCheck(null);
      if (coursePreview) {
        try {
          sessionStorage.setItem(
            'course-draft:' + input.taskId,
            submittedText.current ?? input.text,
          );
        } catch {
          // The synthetic preview can be rewritten when browser storage is blocked.
        }
      }
      allowNavigation();
      router.push(
        preview
          ? coursePreview
            ? '/dev/preview/course-feedback?task=' + input.taskId
            : '/dev/preview/feedback'
          : '/feedback/' + result.submissionId,
      );
      return;
    }
    if (result.status === 'pending') {
      setError('recoverable');
      return;
    }
    rememberCheck(null);
    setError(checkErrors[result.code] ?? 'error');
  }

  async function check(recover = false) {
    if (running.current) return;
    running.current = true;
    setPending(true);
    setError(null);
    try {
      if (!recover) submittedText.current = input.text;
      const key = requestKey.current ?? crypto.randomUUID();
      rememberCheck(key);
      const options = coursePreview ? { endpoint: '/dev/preview/course-api' } : {};
      const result = recover
        ? await recoverCoach(key, options)
        : await requestCoach(input, key, options);
      handleResult(result);
    } catch {
      setError('recoverable');
    } finally {
      running.current = false;
      setPending(false);
    }
  }

  function restore() {
    try {
      const savedKey = sessionStorage.getItem(recoveryStorageKey);
      if (savedKey && /^[a-f0-9-]{36}$/i.test(savedKey)) {
        requestKey.current = savedKey;
        void check(true);
      }
    } catch {
      // Do not block writing when browser storage is unavailable.
    }
  }

  return { pending, error, check, restore, recoveryStorageKey, clearError: () => setError(null) };
}
