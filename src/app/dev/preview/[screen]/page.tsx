import { notFound } from 'next/navigation';
import Today from '@/components/today/Today';
import Studio from '@/components/studio/Studio';
import LiveStudio from '@/components/studio/LiveStudio';
import FeedbackView from '@/components/feedback/FeedbackView';
import { locateCorrections } from '@/lib/feedback/locate';
import { sampleDraft } from '@/mocks/draft.sample';
import { markedPageSample } from '@/mocks/markedPage.sample';
import { manyCorrectionsSample, manyCorrectionsText } from '@/mocks/manyCorrections.sample';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ screen: string }>;
  searchParams: Promise<{ revise?: string }>;
}) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { screen } = await params;
  if (screen === 'today') return <Today preview />;
  if (screen === 'write') return <Studio />;
  if (screen === 'live-write')
    return (
      <LiveStudio
        initialText=""
        parentSubmissionId={(await searchParams).revise === 'preview' ? 'preview' : undefined}
        preview
      />
    );
  if (screen === 'feedback' || screen === 'feedback-many') {
    const feedback = screen === 'feedback-many' ? manyCorrectionsSample : markedPageSample;
    const text = screen === 'feedback-many' ? manyCorrectionsText : sampleDraft;
    return (
      <FeedbackView
        submissionId="preview"
        text={text}
        feedback={{
          ...feedback,
          corrections: locateCorrections(text, feedback.corrections),
        }}
        mock
      />
    );
  }
  notFound();
}
