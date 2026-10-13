import { FeedbackSchema } from '@/lib/feedback/schema';
import sampleFeedback from './feedback.sample.json';

// Visual fixture only. Never use these corrections to grade arbitrary learner writing.
export const markedPageSample = FeedbackSchema.parse({
  ...sampleFeedback,
  corrections: [
    {
      original: 'go',
      suggestion: 'went',
      tag: 'verb-tense',
      severity: 'major',
      explanation: 'Use went for a finished activity last weekend.',
      confidence: 0.98,
    },
    {
      original: 'swimmed',
      suggestion: 'swam',
      tag: 'verb-tense',
      severity: 'major',
      explanation: 'Swim has an irregular past form: swam.',
      confidence: 0.98,
    },
    {
      original: 'eat',
      suggestion: 'ate',
      tag: 'verb-tense',
      severity: 'major',
      explanation: 'Use ate to describe your ice cream last weekend.',
      confidence: 0.98,
    },
  ],
  level_up_rewrite:
    'Hi Maria! Last weekend I went to the beach with my family. We swam in the sea and ate ice cream. We returned home tired but happy. Would you like to come with us next weekend?',
});
