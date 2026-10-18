export type DomainErrorCode =
  | 'NOT_FOUND'
  | 'LESSON_LOCKED'
  | 'WARMUPS_REQUIRED'
  | 'INVALID_INPUT'
  | 'PLACEMENT_PENDING'
  | 'PLACEMENT_LIMIT'
  | 'PLACEMENT_REQUIRED'
  | 'PRACTICE_CONFLICT'
  | 'ANSWER_HIDDEN';

// Application rules report a reason; HTTP and page adapters choose how to present it.
export class DomainError extends Error {
  constructor(public code: DomainErrorCode) {
    super(code);
  }
}
