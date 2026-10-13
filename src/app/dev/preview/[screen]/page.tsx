import { notFound } from 'next/navigation';
import Today from '@/components/today/Today';
import Studio from '@/components/studio/Studio';
import LiveStudio from '@/components/studio/LiveStudio';
import FeedbackView from '@/components/feedback/FeedbackView';
import { locateCorrections } from '@/lib/feedback/locate';
import { sampleDraft } from '@/mocks/draft.sample';
import { markedPageSample } from '@/mocks/markedPage.sample';
export default async function Page({ params }: { params: Promise<{ screen: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { screen } = await params;
  if (screen === 'today') return <Today preview />;
  if (screen === 'write') return <Studio />;
  if (screen === 'live-write') return <LiveStudio initialText="" preview />;
  if (screen === 'feedback') {
    const feedback = markedPageSample;
    return (
      <FeedbackView
        submissionId="preview"
        text={sampleDraft}
        feedback={{
          ...feedback,
          corrections: locateCorrections(sampleDraft, feedback.corrections),
        }}
        mock
      />
    );
  }
  notFound();
}
