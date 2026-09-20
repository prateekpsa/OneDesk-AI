/**
 * Result of a write function (Phase 3). `success: false` covers an expected,
 * named refusal (e.g. "ticket is closed") - not an unexpected error, which
 * still throws/rejects normally and should be handled with try/catch by the
 * caller.
 */
export interface IWriteResult {
  success: boolean;
  message?: string;
}
