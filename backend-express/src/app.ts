import express, { type Express } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { getEnv } from '@/config/env.js'
import { requestLogger } from '@/middleware/logger.middleware.js'
import { errorHandler, notFoundHandler } from '@/middleware/error.middleware.js'
import { apiRouter } from '@/shared/api-router.js'

export function createApp(): Express {
  const env = getEnv()
  const app = express()

  app.disable('x-powered-by')
  app.set('trust proxy', 1)

  app.use(helmet())
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
    }),
  )
  app.use(cookieParser())
  app.use(express.json({ limit: '1mb' }))
  app.use(requestLogger)

  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60_000,
      max: 1_000,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    }),
  )

  app.use('/api', apiRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
