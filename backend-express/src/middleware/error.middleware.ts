import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'
import { AppError, httpStatusForCode } from '@/shared/errors.js'
import { logger } from '@/shared/logger.js'
import { getEnv } from '@/config/env.js'

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({
    statusCode: 404,
    message: 'Route not found',
    error: 'NOT_FOUND',
  })
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    const status = httpStatusForCode(err.code)
    if (status >= 500) logger.error({ err, requestId: req.id }, 'app error (5xx)')
    else logger.warn({ err, requestId: req.id }, 'app error')
    res.status(status).json({
      statusCode: status,
      message: err.message,
      error: err.code,
    })
    return
  }

  if (err instanceof ZodError) {
    logger.warn({ err: err.issues, requestId: req.id }, 'validation error')
    res.status(400).json({
      statusCode: 400,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      details: err.flatten(),
    })
    return
  }

  logger.error({ err, requestId: req.id }, 'unhandled error')
  const env = getEnv()
  res.status(500).json({
    statusCode: 500,
    message:
      env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err instanceof Error
          ? err.message
          : String(err),
    error: 'INTERNAL_ERROR',
  })
}
