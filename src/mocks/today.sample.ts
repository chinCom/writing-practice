import { summarizeProgress } from '@/lib/progress';
import type { SavedSubmission } from '@/components/today/SavedFeedback';
import type { LearningSnapshotData } from '@/components/today/LearningSnapshot';

export const todayProgressSample = summarizeProgress(
  [
    { at: '2026-10-13T09:00:00Z', words: 60, level: 'A2', corrections: [] },
    { at: '2026-10-13T10:00:00Z', words: 60, level: 'A2', corrections: [] },
    { at: '2026-10-14T09:00:00Z', words: 90, level: 'A2', corrections: [] },
    { at: '2026-10-14T10:00:00Z', words: 90, level: 'A2', corrections: [] },
  ],
  [],
  new Date('2026-10-14T12:00:00Z'),
);
export const todaySubmissionsSample: SavedSubmission[] = [
  {
    id: 'weekend',
    title: 'Weekend message',
    createdAt: '2026-10-14T10:00:00Z',
    wordCount: 90,
    attempt: 2,
  },
  {
    id: 'city',
    title: 'A day in my city',
    createdAt: '2026-10-13T10:00:00Z',
    wordCount: 60,
    attempt: 1,
  },
  {
    id: 'introduction',
    title: 'Introducing myself',
    createdAt: '2026-10-13T09:00:00Z',
    wordCount: 60,
    attempt: 1,
  },
];
export const todayPathSample: LearningSnapshotData = {
  level: 'A2',
  title: 'Messages that connect',
  steps: [
    { title: 'read', state: 'done' },
    { title: 'practice', state: 'current' },
    { title: 'write', state: 'locked' },
  ],
};
