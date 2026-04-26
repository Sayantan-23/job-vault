import pino from 'pino'
import { getEnv } from '@/config/env.js'

function createLogger() {
  const env = getEnv()
  const options: pino.LoggerOptions = {
    level: env.LOG_LEVEL,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        '*.password',
        '*.passwordHash',
        '*.refreshToken',
        '*.accessToken',
      ],
      censor: '[REDACTED]',
    },
    ...(env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty', options: { colorize: true, singleLine: true } } }
      : {}),
  }
  return pino(options)
}

export const logger = createLogger()
export type Logger = typeof logger
