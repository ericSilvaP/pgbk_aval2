const APP_ERROR_STATUS_CODES = {
  VALIDATION_ERROR: 400,
  HOLIDAY_TRIP_NOT_ALLOWED: 409,
  HOLIDAYS_API_UNAVAILABLE: 502,
  INTERNAL_SERVER_ERROR: 500,
} as const

export type AppErrorCode = keyof typeof APP_ERROR_STATUS_CODES

export class AppError extends Error {
  public readonly code: AppErrorCode
  public readonly statusCode: number

  public constructor(code: AppErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'AppError'
    this.code = code
    this.statusCode = APP_ERROR_STATUS_CODES[code]
  }
}

export function createValidationError(message: string, options?: ErrorOptions): AppError {
  return new AppError('VALIDATION_ERROR', message, options)
}

export function createHolidayTripNotAllowedError(
  message: string,
  options?: ErrorOptions,
): AppError {
  return new AppError('HOLIDAY_TRIP_NOT_ALLOWED', message, options)
}

export function createHolidaysApiUnavailableError(
  message: string,
  options?: ErrorOptions,
): AppError {
  return new AppError('HOLIDAYS_API_UNAVAILABLE', message, options)
}

export function createInternalServerError(options?: ErrorOptions): AppError {
  return new AppError('INTERNAL_SERVER_ERROR', 'An unexpected error occurred', options)
}
