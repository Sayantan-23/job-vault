import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./scheduler.repository.js', () => ({
  schedulerRepository: { findAllNonArchivedJobs: vi.fn(), setJobGhostDays: vi.fn() },
}))
vi.mock('@/modules/notifications/notifications.service.js', () => ({
  notificationsService: { create: vi.fn() },
}))

import { schedulerRepository } from './scheduler.repository.js'
import { notificationsService } from '@/modules/notifications/notifications.service.js'
import { sweepGhostAlerts } from './ghost-sweep.js'
import type { JobRow } from '@/db/schema/jobs.js'

const jobs = vi.mocked(schedulerRepository)
const notifications = vi.mocked(notificationsService)
const day = 86_400_000

function fakeJob(over: Partial<JobRow> = {}): JobRow {
  return {
    id: 'j1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', title: 'SWE', company: 'Acme',
    location: null, salaryRange: null, sourceUrl: null, snapshotMarkdown: null, status: 'APPLIED',
    kanbanOrder: 1, lastActivityAt: null, ghostDays: 0, notes: null, ...over,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('sweepGhostAlerts', () => {
  it('fires the 7-day alert once when crossing prev<=7 -> 7<new<=14', async () => {
    const now = new Date('2026-06-20T00:00:00Z')
    jobs.findAllNonArchivedJobs.mockResolvedValue([
      fakeJob({ id: 'j1', userId: 'u1', company: 'Acme', title: 'SWE', ghostDays: 7, lastActivityAt: new Date(now.getTime() - 8 * day) }),
    ])
    notifications.create.mockResolvedValue({} as never)

    const fired = await sweepGhostAlerts(now)

    expect(fired).toBe(1)
    expect(notifications.create).toHaveBeenCalledTimes(1)
    expect(notifications.create).toHaveBeenCalledWith({
      userId: 'u1',
      message: 'Acme - SWE has been inactive for 8 days',
      type: 'GHOST_ALERT',
      relatedJobId: 'j1',
    })
    expect(jobs.setJobGhostDays).toHaveBeenCalledWith('j1', 8)
  })

  it('does NOT re-fire the 7-day alert when prev=8 -> new=9', async () => {
    const now = new Date('2026-06-20T00:00:00Z')
    jobs.findAllNonArchivedJobs.mockResolvedValue([
      fakeJob({ id: 'j1', ghostDays: 8, lastActivityAt: new Date(now.getTime() - 9 * day) }),
    ])
    const fired = await sweepGhostAlerts(now)
    expect(fired).toBe(0)
    expect(notifications.create).not.toHaveBeenCalled()
    expect(jobs.setJobGhostDays).toHaveBeenCalledWith('j1', 9)
  })

  it('fires the 14-day alert once when crossing prev<=14 -> new>14 (already past 7)', async () => {
    const now = new Date('2026-06-20T00:00:00Z')
    jobs.findAllNonArchivedJobs.mockResolvedValue([
      fakeJob({ id: 'j1', userId: 'u1', company: 'Acme', title: 'SWE', ghostDays: 14, lastActivityAt: new Date(now.getTime() - 15 * day) }),
    ])
    notifications.create.mockResolvedValue({} as never)

    const fired = await sweepGhostAlerts(now)

    expect(fired).toBe(1)
    expect(notifications.create).toHaveBeenCalledTimes(1)
    expect(notifications.create).toHaveBeenCalledWith({
      userId: 'u1',
      message: 'Ghost alert: Acme - SWE - no activity for 15 days',
      type: 'GHOST_ALERT',
      relatedJobId: 'j1',
    })
    expect(jobs.setJobGhostDays).toHaveBeenCalledWith('j1', 15)
  })

  it('fires BOTH alerts in a single run when a job jumps prev<=7 -> new>14 (double crossing)', async () => {
    const now = new Date('2026-06-20T00:00:00Z')
    jobs.findAllNonArchivedJobs.mockResolvedValue([
      fakeJob({ id: 'j1', userId: 'u1', company: 'Acme', title: 'SWE', ghostDays: 3, lastActivityAt: new Date(now.getTime() - 20 * day) }),
    ])
    notifications.create.mockResolvedValue({} as never)

    const fired = await sweepGhostAlerts(now)

    // Two independent thresholds crossed in one run -> two notifications.
    expect(fired).toBe(2)
    expect(notifications.create).toHaveBeenCalledTimes(2)
    expect(notifications.create).toHaveBeenCalledWith({
      userId: 'u1',
      message: 'Acme - SWE has been inactive for 20 days',
      type: 'GHOST_ALERT',
      relatedJobId: 'j1',
    })
    expect(notifications.create).toHaveBeenCalledWith({
      userId: 'u1',
      message: 'Ghost alert: Acme - SWE - no activity for 20 days',
      type: 'GHOST_ALERT',
      relatedJobId: 'j1',
    })
    expect(jobs.setJobGhostDays).toHaveBeenCalledWith('j1', 20)
  })

  it('persists ghostDays without firing when no threshold is crossed', async () => {
    const now = new Date('2026-06-20T00:00:00Z')
    jobs.findAllNonArchivedJobs.mockResolvedValue([
      fakeJob({ id: 'j1', ghostDays: 2, lastActivityAt: new Date(now.getTime() - 3 * day) }),
    ])
    const fired = await sweepGhostAlerts(now)
    expect(fired).toBe(0)
    expect(notifications.create).not.toHaveBeenCalled()
    expect(jobs.setJobGhostDays).toHaveBeenCalledWith('j1', 3)
  })

  it('fires the 7-day alert exactly once across two consecutive daily runs (dedup)', async () => {
    // Day 1: a job at lastActivity = 8 days before "now", with the stored anchor
    // still at its day-0 value (0). It crosses 7 -> one alert, and the new anchor (8)
    // is persisted. We feed that persisted anchor back in for Day 2 (one day later,
    // now 9 days inactive): prev=8 > 7 means NO re-fire.
    const day1Now = new Date('2026-06-20T00:00:00Z')
    const lastActivity = new Date(day1Now.getTime() - 8 * day) // 8 days before day1

    jobs.findAllNonArchivedJobs.mockResolvedValueOnce([
      fakeJob({ id: 'j1', userId: 'u1', company: 'Acme', title: 'SWE', ghostDays: 0, lastActivityAt: lastActivity }),
    ])
    notifications.create.mockResolvedValue({} as never)

    const firedDay1 = await sweepGhostAlerts(day1Now)
    expect(firedDay1).toBe(1)
    // capture the anchor the sweep persisted on day 1
    const persistedDay1 = jobs.setJobGhostDays.mock.calls.at(-1)?.[1]
    expect(persistedDay1).toBe(8)

    // Day 2: one day later, same lastActivity (now 9 days stale), anchor fed back in.
    const day2Now = new Date(day1Now.getTime() + day)
    jobs.findAllNonArchivedJobs.mockResolvedValueOnce([
      fakeJob({ id: 'j1', userId: 'u1', company: 'Acme', title: 'SWE', ghostDays: persistedDay1 as number, lastActivityAt: lastActivity }),
    ])

    const firedDay2 = await sweepGhostAlerts(day2Now)
    expect(firedDay2).toBe(0)

    // Across both runs the 7-day alert fired exactly once total.
    expect(notifications.create).toHaveBeenCalledTimes(1)
  })
})
