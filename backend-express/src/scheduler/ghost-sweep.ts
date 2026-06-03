import { schedulerRepository } from './scheduler.repository.js'
import { notificationsService } from '@/modules/notifications/notifications.service.js'
import { GHOST_STALE_DAYS, GHOST_GHOST_DAYS, deriveGhostDays } from '@/shared/ghost.js'

/**
 * Daily ghost sweep across ALL users' non-ARCHIVED jobs (system-wide via the
 * scheduler repository — deliberately not user-scoped, unlike request paths).
 *
 * For each job it compares the stored `ghostDays` (the previous-run anchor) with
 * the freshly derived value and fires a GHOST_ALERT once per threshold crossing
 * (prev <= T && next > T). The 7-day and 14-day checks are TWO INDEPENDENT ifs, so
 * a job that jumps from prev<=7 straight past 14 in one run fires BOTH alerts
 * (legacy parity). The new anchor is then persisted so each threshold never
 * re-fires on a later run. `now` is injected for testability. Returns the number
 * of alerts fired.
 */
export async function sweepGhostAlerts(now: Date): Promise<number> {
  const jobs = await schedulerRepository.findAllNonArchivedJobs()
  let fired = 0

  for (const job of jobs) {
    const prev = job.ghostDays
    const next = deriveGhostDays({ lastActivityAt: job.lastActivityAt, createdAt: job.createdAt }, now.getTime())

    if (prev <= GHOST_STALE_DAYS && next > GHOST_STALE_DAYS) {
      await notificationsService.create({
        userId: job.userId,
        message: `${job.company} - ${job.title} has been inactive for ${next} days`,
        type: 'GHOST_ALERT',
        relatedJobId: job.id,
      })
      fired += 1
    }

    if (prev <= GHOST_GHOST_DAYS && next > GHOST_GHOST_DAYS) {
      await notificationsService.create({
        userId: job.userId,
        message: `Ghost alert: ${job.company} - ${job.title} - no activity for ${next} days`,
        type: 'GHOST_ALERT',
        relatedJobId: job.id,
      })
      fired += 1
    }

    await schedulerRepository.setJobGhostDays(job.id, next)
  }

  return fired
}
