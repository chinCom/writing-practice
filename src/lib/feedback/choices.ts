import { z } from 'zod';
export const correctionStatus = z.enum(['open', 'applied', 'dismissed']);
export const reportReason = z.enum(['incorrect', 'meaning', 'unclear', 'other']);
export const correctionReference = z.strictObject({
  submissionId: z.uuid(),
  correctionIndex: z.number().int().min(0).max(11),
});
export const choiceInput = z.union([
  correctionReference.extend({ status: correctionStatus }),
  correctionReference.extend({ reveal: z.literal(true) }),
]);
export const reportInput = correctionReference.extend({ reason: reportReason });
export type CorrectionStatus = z.infer<typeof correctionStatus>;
export type ReportReason = z.infer<typeof reportReason>;
export type CorrectionChoice = {
  correctionIndex: number;
  status: CorrectionStatus;
  reason: ReportReason | null;
  revealed?: boolean;
};
