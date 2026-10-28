'use client';
import { useMemo, useState } from 'react';
import type { CorrectionChoice, ReportReason } from '@/lib/feedback/choices';
import type { LocatedFeedback } from '@/lib/feedback/schema';
import {
  correctionReviewState,
  nextOpenCorrection,
  visibleCorrectionIndexes,
} from '@/lib/feedback/review';
import { revisionText } from '@/lib/revision';
import { useUnsavedWriting } from '@/lib/use-unsaved-writing';
import { useCorrectionChoices } from './use-correction-choices';

type FeedbackReviewOptions = {
  submissionId: string;
  text: string;
  feedback: LocatedFeedback;
  preview: boolean;
  initialChoices?: CorrectionChoice[];
  answersUnlocked: boolean;
  desktop: boolean;
  leaveWarning: string;
};

export function useFeedbackReview({
  submissionId,
  text,
  feedback,
  preview,
  initialChoices,
  answersUnlocked,
  desktop,
  leaveWarning,
}: FeedbackReviewOptions) {
  const [active, setActive] = useState(0);
  const [sheet, setSheet] = useState(false);
  const choiceState = useCorrectionChoices(submissionId, preview, initialChoices);
  useUnsavedWriting(choiceState.pending || choiceState.errors.length > 0, leaveWarning);
  const { hiddenAnswers, applied, rewriteAvailable } = useMemo(
    () => correctionReviewState(feedback, choiceState.choices, answersUnlocked),
    [feedback, choiceState.choices, answersUnlocked],
  );
  const total = feedback.corrections.length;
  const correction = feedback.corrections[active];
  const activeChoice = choiceState.choices.find((choice) => choice.correctionIndex === active);

  function select(index: number) {
    setActive(index);
    if (!desktop) setSheet(true);
  }
  function apply() {
    if (choiceState.loading || choiceState.loadError) return;
    const undo = applied.has(active);
    void choiceState.save({ correctionIndex: active, status: undo ? 'open' : 'applied' });
    if (!undo) {
      const next = nextOpenCorrection(active, total, choiceState.choices);
      if (next !== undefined) setActive(next);
    }
  }
  function dismiss() {
    void choiceState.save({
      correctionIndex: active,
      status: activeChoice?.status === 'dismissed' ? 'open' : 'dismissed',
    });
  }
  function reveal() {
    void choiceState.save({ correctionIndex: active, reveal: true });
  }
  function report(reason: ReportReason) {
    return choiceState.save({ correctionIndex: active, reason });
  }
  function retryReport() {
    // Preserve the queue's existing first-error retry semantics.
    if (choiceState.error) void choiceState.save(choiceState.error.change);
  }
  function prepareRevision() {
    try {
      sessionStorage.setItem(
        'feedback-revision:' + submissionId,
        revisionText(text, feedback.corrections, applied),
      );
    } catch {
      // A blocked browser store leaves the original revision available on the server.
    }
  }

  return {
    active,
    sheet,
    setSheet,
    total,
    correction,
    activeChoice,
    choiceState,
    applied,
    hiddenAnswers,
    rewriteAvailable,
    visibleIndexes: visibleCorrectionIndexes(active, total),
    select,
    apply,
    dismiss,
    reveal,
    report,
    retryReport,
    prepareRevision,
  };
}
