import cron, { type ScheduledTask } from 'node-cron'
import { logger } from '@/shared/logger.js'
import { sweepDueReminders } from './reminder-sweep.js'
import { sweepGhostAlerts } from './ghost-sweep.js'

let tasks: ScheduledTask[] = []

export function startScheduler(): ScheduledTask[] {
  const reminderTask = cron.schedule('*/5 * * * *', () => {
    void (async () => {
      try {
        const swept = await sweepDueReminders(new Date())
        if (swept > 0) logger.info({ swept }, 'reminder sweep fired notifications')
      } catch (err) {
        logger.error({ err }, 'reminder sweep failed')
      }
    })()
  })

  const ghostTask = cron.schedule('0 0 * * *', () => {
    void (async () => {
      try {
        const fired = await sweepGhostAlerts(new Date())
        if (fired > 0) logger.info({ fired }, 'ghost sweep fired alerts')
      } catch (err) {
        logger.error({ err }, 'ghost sweep failed')
      }
    })()
  })

  tasks = [reminderTask, ghostTask]
  logger.info('scheduler started')
  return tasks
}

export function stopScheduler(): void {
  for (const task of tasks) task.stop()
  tasks = []
}
