import 'dotenv/config'
import { createApp } from './app.js'
import { getEnv } from './config/env.js'
import { logger } from './shared/logger.js'
import { closeDb } from './db/client.js'
import { startScheduler, stopScheduler } from './scheduler/scheduler.js'

const env = getEnv()
const app = createApp()

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'backend-express started')
})

// Started only after listen() (never inside createApp), so supertest/vitest never
// spin live timers. Gated on ENABLE_SCHEDULER and off in test.
if (env.ENABLE_SCHEDULER && env.NODE_ENV !== 'test') {
  startScheduler()
}

function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down')
  stopScheduler()
  const forceExit = setTimeout(() => {
    logger.error('forced exit after 10s')
    process.exit(1)
  }, 10_000)
  forceExit.unref()

  server.close(async (err) => {
    if (err) logger.error({ err }, 'server close failed')
    try {
      await closeDb()
    } catch (closeErr) {
      logger.error({ err: closeErr }, 'db close failed')
    }
    process.exit(err ? 1 : 0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'unhandledRejection')
})
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaughtException')
  shutdown('uncaughtException')
})
