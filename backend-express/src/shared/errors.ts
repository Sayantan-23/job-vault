export type AppErrorCode =
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  VALIDATION_ERROR: 400,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
}

export function httpStatusForCode(code: AppErrorCode): number {
  return STATUS_BY_CODE[code]
}

export class AppError extends Error {
  public readonly code: AppErrorCode
  public override readonly cause?: unknown

  constructor(code: AppErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    if (cause !== undefined) this.cause = cause
  }
}
