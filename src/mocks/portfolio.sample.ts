import type { RevisionComparison } from '@/lib/revision';
export const revisionSample: RevisionComparison = {
  original: {
    id: '00000000-0000-4000-8000-000000000201',
    createdAt: '2026-10-13T12:00:00Z',
    text: 'I go to the beach. It was fun.',
    wordCount: 9,
    attempt: 1,
    parentSubmissionId: null,
    scores: { task: 2, organization: 3, grammar: 2, vocabulary: 3 },
  },
  current: {
    id: '00000000-0000-4000-8000-000000000202',
    createdAt: '2026-10-14T12:00:00Z',
    text: 'I went to the beach. It was fun. Would you like to join me?',
    wordCount: 16,
    attempt: 2,
    parentSubmissionId: '00000000-0000-4000-8000-000000000201',
    scores: { task: 4, organization: 3, grammar: 4, vocabulary: 2 },
  },
};
