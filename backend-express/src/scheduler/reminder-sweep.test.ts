import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/modules/reminders/reminders.repository.js', () => ({
  remindersRepository: { findDue: vi.fn(), markCompleted: vi.fn() },
}))
vi.mock('@/modules/notifications/notifications.service.js', () => ({
  notificationsService: { create: vi.fn() },
}))

import { remindersRepository } from '@/modules/reminders/reminders.repository.js'
import { notificationsService } from '@/modules/notifications/notifications.service.js'
import { sweepDueReminders } from './reminder-sweep.js'
import type { ReminderRow } from '@/db/schema/reminders.js'

const repo = vi.mocked(remindersRepository)
const notifications = vi.mocked(notificationsService)

function fakeReminder(over: Partial<ReminderRow> = {}): ReminderRow {
  return {
    id: 'r1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', jobId: 'j1',
    message: 'Ping recruiter', remindAt: new Date('2000-01-01T00:00:00Z'), isCompleted: false, ...over,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('sweepDueReminders', () => {
  it('creates a REMINDER notification per due reminder and marks them completed', async () => {
    repo.findDue.mockResolvedValue([
      fakeReminder({ id: 'r1', userId: 'u1', jobId: 'j1', message: 'A' }),
      fakeReminder({ id: 'r2', userId: 'u2', jobId: 'j2', message: 'B' }),
    ])
    notifications.create.mockResolvedValue({} as never)
    const now = new Date('2026-06-20T00:00:00Z')

    const count = await sweepDueReminders(now)

    expect(count).toBe(2)
    expect(repo.findDue).toHaveBeenCalledWith(now)
    expect(notifications.create).toHaveBeenCalledWith({ userId: 'u1', message: 'A', type: 'REMINDER', relatedJobId: 'j1' })
    expect(notifications.create).toHaveBeenCalledWith({ userId: 'u2', message: 'B', type: 'REMINDER', relatedJobId: 'j2' })
    expect(repo.markCompleted).toHaveBeenCalledWith(['r1', 'r2'])
  })

  it('is a no-op when nothing is due', async () => {
    repo.findDue.mockResolvedValue([])
    const count = await sweepDueReminders(new Date())
    expect(count).toBe(0)
    expect(notifications.create).not.toHaveBeenCalled()
    expect(repo.markCompleted).not.toHaveBeenCalled()
  })

  it('queries with the exact UTC instant it is given (now passed straight to findDue)', async () => {
    // The sweep is pure: it forwards the injected `now` to findDue unchanged, so the
    // due-boundary comparison happens on the stored UTC timestamp (see the
    // repository's UTC-boundary findDue test). Here we prove the contract that the
    // boundary instant is the one passed in — not Date.now() or a local-adjusted value.
    repo.findDue.mockResolvedValue([])
    const boundary = new Date('2026-06-20T00:00:00.000Z')
    await sweepDueReminders(boundary)
    expect(repo.findDue).toHaveBeenCalledWith(boundary)
    expect(repo.findDue.mock.calls[0]?.[0]?.toISOString()).toBe('2026-06-20T00:00:00.000Z')
  })
})
