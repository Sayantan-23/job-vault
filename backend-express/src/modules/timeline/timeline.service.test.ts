import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./timeline.repository.js', () => ({
  timelineRepository: {
    findByJob: vi.fn(),
    findByUser: vi.fn(),
    create: vi.fn(),
  },
}))
vi.mock('@/modules/jobs/jobs.repository.js', () => ({
  jobsRepository: {
    findById: vi.fn(),
    update: vi.fn(),
  },
}))

import { timelineRepository } from './timeline.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'
import { timelineService } from './timeline.service.js'
import type { TimelineEventRow } from '@/db/schema/timeline.js'
import type { JobRow } from '@/db/schema/jobs.js'

const timeline = vi.mocked(timelineRepository)
const jobs = vi.mocked(jobsRepository)

function fakeJob(over: Record<string, unknown> = {}): JobRow {
  return {
    id: 'j1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', title: 'SWE', company: 'Acme',
    location: null, salaryRange: null, sourceUrl: null, snapshotMarkdown: null, status: 'WISHLIST',
    kanbanOrder: 1, lastActivityAt: new Date(), ghostDays: 0, notes: null, ...over,
  }
}

function fakeEvent(over: Record<string, unknown> = {}): TimelineEventRow {
  return {
    id: 't1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', jobId: 'j1',
    type: 'MANUAL', title: 'note', description: null, ...over,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('timelineService.list', () => {
  it('throws NOT_FOUND when the job is missing or not owned', async () => {
    jobs.findById.mockResolvedValue(null)
    await expect(timelineService.list('u1', 'missing')).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(timeline.findByJob).not.toHaveBeenCalled()
  })

  it("returns the job's events when owned", async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    timeline.findByJob.mockResolvedValue([fakeEvent()])
    const rows = await timelineService.list('u1', 'j1')
    expect(jobs.findById).toHaveBeenCalledWith('u1', 'j1')
    expect(rows).toHaveLength(1)
  })
})

describe('timelineService.listForUser', () => {
  it('translates page/limit into a limit + offset and echoes the pagination back', async () => {
    timeline.findByUser.mockResolvedValue({ rows: [], total: 42 })
    const result = await timelineService.listForUser('u1', { page: 3, limit: 10 })
    // page 3 @ 10/page -> offset 20
    expect(timeline.findByUser).toHaveBeenCalledWith('u1', 10, 20)
    expect(result).toEqual({ rows: [], total: 42, page: 3, limit: 10 })
  })

  it('uses offset 0 for the first page', async () => {
    timeline.findByUser.mockResolvedValue({ rows: [], total: 0 })
    await timelineService.listForUser('u1', { page: 1, limit: 50 })
    expect(timeline.findByUser).toHaveBeenCalledWith('u1', 50, 0)
  })
})

describe('timelineService.addManualEntry', () => {
  it('throws NOT_FOUND when the job is missing or not owned', async () => {
    jobs.findById.mockResolvedValue(null)
    await expect(
      timelineService.addManualEntry('u1', 'missing', { title: 'hi' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(timeline.create).not.toHaveBeenCalled()
  })

  it('writes a MANUAL event and bumps lastActivityAt via an empty job update', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    timeline.create.mockResolvedValue(fakeEvent({ title: 'Called recruiter' }))
    jobs.update.mockResolvedValue(fakeJob())
    const row = await timelineService.addManualEntry('u1', 'j1', { title: 'Called recruiter', description: 'vm' })
    expect(timeline.create).toHaveBeenCalledWith({
      userId: 'u1', jobId: 'j1', type: 'MANUAL', title: 'Called recruiter', description: 'vm',
    })
    expect(jobs.update).toHaveBeenCalledWith('u1', 'j1', {})
    expect(row.title).toBe('Called recruiter')
  })

  it('omits description when not provided', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    timeline.create.mockResolvedValue(fakeEvent())
    jobs.update.mockResolvedValue(fakeJob())
    await timelineService.addManualEntry('u1', 'j1', { title: 'just a title' })
    expect(timeline.create).toHaveBeenCalledWith({
      userId: 'u1', jobId: 'j1', type: 'MANUAL', title: 'just a title',
    })
  })
})

describe('timelineService.addAutoEntry', () => {
  it('writes an AUTO event and does NOT bump lastActivityAt', async () => {
    timeline.create.mockResolvedValue(fakeEvent({ type: 'AUTO', title: 'Job added to vault' }))
    await timelineService.addAutoEntry({
      userId: 'u1', jobId: 'j1', title: 'Job added to vault', description: 'Added to WISHLIST column',
    })
    expect(timeline.create).toHaveBeenCalledWith({
      userId: 'u1', jobId: 'j1', type: 'AUTO', title: 'Job added to vault', description: 'Added to WISHLIST column',
    })
    expect(jobs.update).not.toHaveBeenCalled()
    expect(jobs.findById).not.toHaveBeenCalled()
  })
})
