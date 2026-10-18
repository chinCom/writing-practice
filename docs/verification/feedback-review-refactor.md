# Feedback review refactor

Date: 2026-10-18

[`useFeedbackReview`](../../src/components/feedback/useFeedbackReview.ts) owns active
correction selection, mobile-sheet state, choice actions, unsaved-choice protection,
and revision preparation. The ordered persistence queue remains unchanged in
`use-correction-choices`. Pure rules in
[`review`](../../src/lib/feedback/review.ts) derive applied/hidden answers, rewrite
availability, next-open selection and the neighboring-card window.

[`FeedbackView`](../../src/components/feedback/FeedbackView.tsx) retains presentation,
responsive rendering and focus-preserving card animation. Desktop and mobile cards
share action props instead of duplicating the same persistence callbacks. Markup,
styles, endpoint choices, timing, queue ordering, explicit retries, reveal rules,
revision storage keys and navigation destinations are unchanged.

## Verification

- Twelve new pure-rule regression cases passed.
- `npm run check`: 262 tests passed, 7 opt-in tests skipped.
- Twenty-eight desktop/mobile checks passed across `correction-choices`,
  `feedback-self-revision`, `marked-page-keyboard`, `feedback-motion`,
  `revision-handoff`, and `explanation`.
- `npm run test:journey`: one integrated synthetic learner journey passed.

These browser checks exercise synthetic API responses. They verify optimistic saves,
retry and load-error behavior, focus retention, reduced motion, answer visibility and
revision transfer, not hosted sign-in or AI quality. No schema, prompt, quota,
dependency, or grading changes were made.
