import { summarizeProgress } from '@/lib/progress';
export const progressSample = summarizeProgress(
  [
    { at: '2026-10-12T10:00:00Z', words: 50, level: 'A2', corrections: [] },
    { at: '2026-10-13T10:00:00Z', words: 50, level: 'A2', corrections: [] },
    {
      at: '2026-10-14T10:00:00Z',
      words: 50,
      level: 'A2',
      corrections: [{ tag: 'verb-tense', confidence: 0.9, severity: 'major' }],
    },
    { at: '2026-10-14T11:00:00Z', words: 25, level: 'A2', corrections: [] },
  ],
  [],
  new Date('2026-10-15T12:00:00Z'),
);
