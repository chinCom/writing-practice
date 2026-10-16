'use client';
import { fetchWithStatus } from '@/lib/network-status';
import { useEffect, useState } from 'react';
import Today from './Today';
import { preferencesResult, type WeeklyGoal } from '@/lib/preferences';
import { progressSample } from '@/mocks/progress.sample';
export default function GoalPreview() {
  const [goal, setGoal] = useState<WeeklyGoal>(5);
  useEffect(() => {
    const controller = new AbortController();
    fetchWithStatus('/api/preferences', {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
      cache: 'no-store',
    })
      .then(async (response) => {
        if (response.ok) setGoal(preferencesResult.parse(await response.json()).weeklyGoal);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return <Today signedIn progress={progressSample} due={2} weeklyGoal={goal} />;
}
