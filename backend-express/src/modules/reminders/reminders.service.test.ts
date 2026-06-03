import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./reminders.repository.js', () => ({
  remindersRepository: {
    create: vi.fn(),
    listForJob: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    findDue: vi.fn(),
    markCompleted: vi.fn(),
  },
}))
vi.mock('@/modules/jobs/jobs.repository.js', () => ({
  jobsRepository: { findById: vi.fn() },
}))

import { remindersRepository } from './reminders.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'
import { remindersService } from './reminders.service.js'
import type { ReminderRow } from '@/db/schema/reminders.js'
import type { JobRow } from '@/db/schema/jobs.js'

const repo = vi.mocked(remindersRepository)
const jobs = vi.mocked(jobsRepository)

function fakeReminder(over: Partial<ReminderRow> = {}): ReminderRow {
  return {
    id: 'r1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', jobId: 'j1',
    message: 'Ping', remindAt: new Date('2026-07-01T00:00:00Z'), isCompleted: false, ...over,
  }
}

function fakeJob(): JobRow {
  return {
    id: 'j1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', title: 'T', company: 'C',
    location: null, salaryRange: null, sourceUrl: null, snapshotMarkdown: null, status: 'APPLIED',
    kanbanOrder: 1, lastActivityAt: new Date(), ghostDays: 0, notes: null,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('remindersService.listForJob', () => {
  it('returns reminders when the job is owned', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    repo.listForJob.mockResolvedValue([fakeReminder()])
    const rows = await remindersService.listForJob('u1', 'j1')
    expect(rows).toHaveLength(1)
  })
  it('throws NOT_FOUND when the job is not owned', async () => {
    jobs.findById.mockResolvedValue(null)
    await expect(remindersService.listForJob('u1', 'jX')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('remindersService.create', () => {
  it('creates a reminder under the owned job', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    repo.create.mockResolvedValue(fakeReminder())
    const created = await remindersService.create('u1', 'j1', { message: 'Ping', remindAt: new Date('2026-07-01T00:00:00Z') })
    expect(repo.create).toHaveBeenCalledWith({ userId: 'u1', jobId: 'j1', message: 'Ping', remindAt: new Date('2026-07-01T00:00:00Z') })
    expect(created.id).toBe('r1')
  })
  it('throws NOT_FOUND when the job is not owned', async () => {
    jobs.findById.mockResolvedValue(null)
    await expect(
      remindersService.create('u1', 'jX', { message: 'Ping', remindAt: new Date() }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('remindersService.update', () => {
  it('updates an owned reminder', async () => {
    repo.update.mockResolvedValue(fakeReminder({ message: 'Edited' }))
    const updated = await remindersService.update('u1', 'r1', { message: 'Edited' })
    expect(updated.message).toBe('Edited')
  })
  it('throws NOT_FOUND when missing', async () => {
    repo.update.mockResolvedValue(null)
    await expect(remindersService.update('u1', 'rX', { message: 'x' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('remindersService.remove', () => {
  it('returns the deleted id', async () => {
    repo.remove.mockResolvedValue(true)
    expect(await remindersService.remove('u1', 'r1')).toEqual({ id: 'r1' })
  })
  it('throws NOT_FOUND when missing', async () => {
    repo.remove.mockResolvedValue(false)
    await expect(remindersService.remove('u1', 'rX')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
