import { FeedbackSchema } from '@/lib/feedback/schema';
import { markedPageSample } from './markedPage.sample';

// Deliberately dense visual fixture. It never grades a learner submission.
export const manyCorrectionsText =
  'Today is so much fun, we have done plenty of things such as playing football, cooking. I love these weekend days so much, after a long week of working, I can finally get my head unwind. I usually have some friends to come on weekend so I would like to invite you come to my house for the next weekend.';
const pairs = [
  [
    'Today is so much fun',
    'Today was so much fun',
    'verb-tense',
    'Use was for a finished activity.',
  ],
  ['we have done', 'we did', 'verb-tense', 'Use the past simple for a finished day.'],
  ['cooking', 'and cooking', 'connectors', 'Use and before the last activity in your list.'],
  ['get my head unwind', 'let my head unwind', 'verb-form', 'Use let before unwind.'],
  [
    'have some friends to come',
    'have some friends come',
    'verb-form',
    'After have, use come without to.',
  ],
  ['on weekend', 'at the weekend', 'prepositions', 'Use at the weekend.'],
  ['invite you come', 'invite you to come', 'verb-form', 'Use to come after invite you.'],
  ['for the next weekend', 'next weekend', 'articles', 'Do not use the before next weekend.'],
];
export const manyCorrectionsSample = FeedbackSchema.parse({
  ...markedPageSample,
  corrections: pairs.map(([original, suggestion, tag, explanation]) => ({
    original,
    suggestion,
    tag,
    explanation,
    severity: 'minor',
    confidence: 0.98,
  })),
});
