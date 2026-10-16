import { z } from 'zod';
import { errorTags } from './taxonomy';

export const Level = z.enum(['PRE_A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
export const ErrorTag = z.enum(errorTags);
const explanation = z.string().min(1).max(1000);
const score = z.number().int().min(0).max(5);
export const CorrectionSchema = z.strictObject({
  original: z.string().min(1).max(300),
  suggestion: z.string().min(1).max(300),
  tag: ErrorTag,
  severity: z.enum(['major', 'minor', 'style']),
  explanation,
  explanation_l1: explanation.optional(),
  confidence: z.number().min(0).max(1),
});
export const TargetReportSchema = z
  .array(
    z.strictObject({
      tag: ErrorTag,
      uses: z.number().int().min(0).max(100),
      errors: z.number().int().min(0).max(100),
      correction_indexes: z.array(z.number().int().min(0).max(11)).max(12),
    }),
  )
  .max(3);
const FeedbackFields = z.strictObject({
  cefr_estimate: Level,
  scores: z.strictObject({ task: score, organization: score, grammar: score, vocabulary: score }),
  strengths: z.array(explanation).min(1).max(3),
  priorities: z.array(z.strictObject({ tag: ErrorTag, why: explanation })).max(3),
  corrections: z.array(CorrectionSchema).max(12),
  level_up_rewrite: z.string().max(10000),
  next_step: explanation,
  safety_flag: z.boolean(),
});
// Saved feedback keeps the full report; the server derives errors and indexes from corrections.
export const FeedbackSchema = FeedbackFields.extend({
  target_report: TargetReportSchema.optional().catch(undefined),
});
// The grader returns only uses per target. Extra fields from older output are stripped.
export const ModelFeedbackSchema = FeedbackFields.extend({
  target_report: z
    .array(z.object({ tag: ErrorTag, uses: z.number().int().min(0).max(100) }))
    .max(3)
    .optional()
    .catch(undefined),
});
export type Feedback = z.infer<typeof FeedbackSchema>;
export type Correction = z.infer<typeof CorrectionSchema>;
export type LocatedCorrection = Correction & { start: number | null; end: number | null };
export type LocatedFeedback = Omit<Feedback, 'corrections'> & { corrections: LocatedCorrection[] };
