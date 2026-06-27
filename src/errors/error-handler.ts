import type { ErrorRequestHandler } from 'express'

import { AppError, createInternalServerError } from './app-error.js'

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    })

    return
  }

  console.error(error)

  const internalServerError = createInternalServerError()

  response.status(internalServerError.statusCode).json({
    success: false,
    error: {
      code: internalServerError.code,
      message: internalServerError.message,
    },
  })
}
