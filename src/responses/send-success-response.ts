import type { Response } from 'express'

export interface SuccessEnvelope<T> {
  success: true
  data: T
}

export function sendSuccessResponse<T>(
  response: Response<SuccessEnvelope<T>>,
  data: T,
  statusCode = 200,
): void {
  response.status(statusCode).json({
    success: true,
    data,
  })
}
