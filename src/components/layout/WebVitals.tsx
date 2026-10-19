'use client';

import { useCallback, useState } from 'react';
import { useReportWebVitals } from 'next/web-vitals';
import { performanceRoute } from '@/lib/observability/routes';

type Vital = Parameters<Parameters<typeof useReportWebVitals>[0]>[0];

export default function WebVitals({ sampleRate }: { sampleRate: number }) {
  const [sampled] = useState(() => Math.random() < sampleRate);
  const report = useCallback(
    (metric: Vital) => {
      if (!sampled) return;
      const body = JSON.stringify({
        id: metric.id,
        name: metric.name,
        value: metric.value,
        route: performanceRoute(new URL(metric.navigationURL || location.href).pathname),
        device: matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop',
        navigationType: metric.navigationType,
      });
      // The payload contains no learner text, user IDs, query strings, or referrer.
      try {
        if (navigator.sendBeacon?.('/api/telemetry', body)) return;
        void fetch('/api/telemetry', {
          method: 'POST',
          body,
          keepalive: true,
          credentials: 'omit',
          headers: { 'Content-Type': 'application/json' },
        }).catch(() => undefined);
      } catch {
        // Monitoring must never interrupt the page or its navigation.
      }
    },
    [sampled],
  );
  useReportWebVitals(report);
  return null;
}
