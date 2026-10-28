import { expect, it, vi } from 'vitest';
import FeedbackPage from '@/app/feedback/[submissionId]/page';
import WritingPage from '@/app/write/[taskId]/page';
import { loadFeedback, loadFeedbackReview } from '@/lib/db/queries';
import { currentUser } from '@/lib/auth/server';
import { weekendTask } from '@/lib/curriculum';
import { markedPageSample } from '@/mocks/markedPage.sample';
import { sampleDraft } from '@/mocks/draft.sample';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth/server', () => ({ currentUser: vi.fn() }));
vi.mock('@/lib/db/queries', () => ({
  loadFeedback: vi.fn(),
  loadFeedbackReview: vi.fn(),
  loadDraft: vi.fn(),
}));
vi.mock('@/lib/db/corrections', () => ({
  loadCorrectionChoices: async () => [],
}));
vi.mock('@/lib/db/curriculum', () => ({ loadTask: async () => weekendTask }));

it('passes a saved mock attempt to real feedback and blocks an unusable twenty-first revision', async () => {
  const id = '00000000-0000-4000-8000-000000000090';
  vi.mocked(currentUser).mockResolvedValue({ id } as NonNullable<
    Awaited<ReturnType<typeof currentUser>>
  >);
  const saved = {
    submission: { id, taskId: 'weekend', text: sampleDraft, attempt: 20 },
    feedback: { model: 'mock', json: markedPageSample },
  };
  vi.mocked(loadFeedbackReview).mockResolvedValue({
    result: saved,
    original: null,
    revisionSubmitted: false,
    choices: [],
  } as unknown as Awaited<ReturnType<typeof loadFeedbackReview>>);
  vi.mocked(loadFeedback).mockResolvedValue(
    saved as unknown as NonNullable<Awaited<ReturnType<typeof loadFeedback>>>,
  );
  const feedback = await FeedbackPage({ params: Promise.resolve({ submissionId: id }) });
  expect(feedback.props.attempt).toBe(20);
  const writing = await WritingPage({
    params: Promise.resolve({ taskId: 'weekend' }),
    searchParams: Promise.resolve({ revise: id }),
  });
  expect(writing.type).not.toBe((await import('@/components/studio/LiveStudio')).default);
});
