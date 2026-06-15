export class OperationError extends Error {
  constructor(
    message: string,
    readonly operation: string,
    readonly details?: Record<string, unknown>,
    readonly cause?: unknown,
  ) {
    super(message);
  }
}
