import type { NextTask } from './next-task';

/**
 * The first loop a learner runs: sign in, choose a task, write, read the
 * feedback, then revise. The guide ends after the first revision, so it does
 * not turn into permanent furniture.
 */
export const firstSessionOrder = ['signIn', 'choose', 'write', 'feedback', 'revise'] as const;

export type FirstSessionStep = (typeof firstSessionOrder)[number];
export type FirstSessionTaskStep = Exclude<FirstSessionStep, 'signIn'>;

export type FirstSessionGuideState = {
  step: FirstSessionTaskStep;
  feedbackId?: string;
};

/**
 * Derive the step for Today from the learner's completed checks. Submissions
 * arrive newest first. A check that has not been revised yet is the clearest
 * next action; once any revision exists the first loop is complete.
 */
export function firstSessionGuide(
  submissions: readonly { id: string; attempt: number }[],
  next?: NextTask,
): FirstSessionGuideState | null {
  const latest = submissions[0];
  if (latest?.attempt === 1) return { step: 'feedback', feedbackId: latest.id };
  if (submissions.some((submission) => submission.attempt > 1)) return null;
  if (submissions.length > 0) return null;
  if (next?.kind === 'placement') return { step: 'choose' };
  return { step: 'write' };
}

/** The zero-based position of a step in the visible five-step rail. */
export function firstSessionIndex(step: FirstSessionTaskStep) {
  return firstSessionOrder.indexOf(step);
}
