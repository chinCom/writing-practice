import { NextResponse } from 'next/server';
import { revisionSample } from '@/mocks/portfolio.sample';
import type { WritingVersion } from '@/lib/revision';

const extras: WritingVersion[] = [
  {
    id: '00000000-0000-4000-8000-000000000203',
    createdAt: '2026-10-12T09:30:00Z',
    text: 'Some people believe that university education should be free for everyone, while others think students should pay for it. In this essay, I will discuss both views and give my opinion. A free system can help talented students who cannot afford tuition, but it also places a large cost on the public budget.',
    wordCount: 56,
    attempt: 1,
    parentSubmissionId: null,
    scores: { task: 4, organization: 3, grammar: 3, vocabulary: 4 },
  },
  {
    id: '00000000-0000-4000-8000-000000000204',
    createdAt: '2026-10-11T16:10:00Z',
    text: 'Hi Anna, I hope you are doing well. I am writing to tell you about my weekend. It was such a great time, and we visited a lake in the mountains. The weather was sunny and we walked for hours. Would you like to come with us next time?',
    wordCount: 51,
    attempt: 2,
    parentSubmissionId: '00000000-0000-4000-8000-000000000201',
    scores: { task: 4, organization: 4, grammar: 3, vocabulary: 3 },
  },
  {
    id: '00000000-0000-4000-8000-000000000205',
    createdAt: '2026-10-10T08:05:00Z',
    text: 'AI is accelerating and advancing very fast, and big companies like OpenAI, Anthropic, and Google are training their models to achieve AGI. With the best yet to come, some of the impossible things we thought could not be done are now possible.',
    wordCount: 43,
    attempt: 1,
    parentSubmissionId: null,
    scores: { task: 3, organization: 3, grammar: 3, vocabulary: 3 },
  },
  {
    id: '00000000-0000-4000-8000-000000000206',
    createdAt: '2026-10-09T19:40:00Z',
    text: 'Last weekend we went to the beach. The weather was warm, and we swam in the sea. I ate a big ice cream and my brother lost his hat. In the evening we returned home tired but happy.',
    wordCount: 38,
    attempt: 1,
    parentSubmissionId: null,
    scores: { task: 4, organization: 3, grammar: 3, vocabulary: 3 },
  },
];
export async function GET() {
  if (process.env.NODE_ENV !== 'development') return new NextResponse(null, { status: 404 });
  return NextResponse.json(
    {
      ok: true,
      data: {
        entries: [revisionSample.current, ...extras, revisionSample.original],
        nextOffset: null,
      },
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
