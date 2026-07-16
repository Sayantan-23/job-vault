import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./contacts.repository.js', () => ({
  contactsRepository: {
    create: vi.fn(),
    listForJob: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    countsForJobs: vi.fn(),
  },
}))
vi.mock('@/modules/jobs/jobs.repository.js', () => ({
  jobsRepository: { findById: vi.fn() },
}))
vi.mock('@/modules/timeline/timeline.service.js', () => ({
  timelineService: { addAutoEntry: vi.fn() },
}))

import { contactsRepository } from './contacts.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'
import { timelineService } from '@/modules/timeline/timeline.service.js'
import { contactsService } from './contacts.service.js'
import type { JobContactRow } from '@/db/schema/job-contacts.js'
import type { JobRow } from '@/db/schema/jobs.js'

const repo = vi.mocked(contactsRepository)
const jobs = vi.mocked(jobsRepository)
const timeline = vi.mocked(timelineService)

function fakeContact(over: Partial<JobContactRow> = {}): JobContactRow {
  return {
    id: 'c1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', jobId: 'j1',
    contact: 'Priya — priya@acme.com', channel: null, status: 'NO_RESPONSE',
    reachedOutAt: new Date('2026-07-01T00:00:00Z'), notes: null, ...over,
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

describe('contactsService.listForJob', () => {
  it('returns contacts when the job is owned', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    repo.listForJob.mockResolvedValue([fakeContact()])
    expect(await contactsService.listForJob('u1', 'j1')).toHaveLength(1)
  })
  it('throws NOT_FOUND when the job is not owned', async () => {
    jobs.findById.mockResolvedValue(null)
    await expect(contactsService.listForJob('u1', 'jX')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('contactsService.create', () => {
  it('creates under the owned job and emits a "Reached out" auto-event', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    repo.create.mockResolvedValue(fakeContact({ channel: 'EMAIL' }))
    timeline.addAutoEntry.mockResolvedValue({} as never)
    const created = await contactsService.create('u1', 'j1', { contact: 'Priya — priya@acme.com', channel: 'EMAIL' })
    expect(created.id).toBe('c1')
    expect(timeline.addAutoEntry).toHaveBeenCalledWith({
      userId: 'u1', jobId: 'j1',
      title: 'Reached out to Priya — priya@acme.com',
      description: 'Via email',
    })
  })
  it('omits the description when no channel is set', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    repo.create.mockResolvedValue(fakeContact())
    timeline.addAutoEntry.mockResolvedValue({} as never)
    await contactsService.create('u1', 'j1', { contact: 'Priya — priya@acme.com' })
    expect(timeline.addAutoEntry).toHaveBeenCalledWith({
      userId: 'u1', jobId: 'j1', title: 'Reached out to Priya — priya@acme.com',
    })
  })
  it('swallows a timeline failure (create still succeeds)', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    repo.create.mockResolvedValue(fakeContact())
    timeline.addAutoEntry.mockRejectedValue(new Error('boom'))
    const created = await contactsService.create('u1', 'j1', { contact: 'X' })
    expect(created.id).toBe('c1')
  })
  it('throws NOT_FOUND when the job is not owned', async () => {
    jobs.findById.mockResolvedValue(null)
    await expect(contactsService.create('u1', 'jX', { contact: 'X' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('contactsService.update', () => {
  it.each([
    ['HEARD_BACK', 'Heard back from Priya — priya@acme.com'],
    ['REFERRED', 'Priya — priya@acme.com referred you'],
    ['DECLINED', 'Priya — priya@acme.com declined to refer'],
  ] as const)('emits an auto-event when status changes to %s', async (status, title) => {
    repo.findById.mockResolvedValue(fakeContact())
    repo.update.mockResolvedValue(fakeContact({ status }))
    timeline.addAutoEntry.mockResolvedValue({} as never)
    await contactsService.update('u1', 'c1', { status })
    expect(timeline.addAutoEntry).toHaveBeenCalledWith({ userId: 'u1', jobId: 'j1', title })
  })
  it('does not emit when status is unchanged', async () => {
    repo.findById.mockResolvedValue(fakeContact({ status: 'HEARD_BACK' }))
    repo.update.mockResolvedValue(fakeContact({ status: 'HEARD_BACK', notes: 'n' }))
    await contactsService.update('u1', 'c1', { status: 'HEARD_BACK', notes: 'n' })
    expect(timeline.addAutoEntry).not.toHaveBeenCalled()
  })
  it('does not emit on a non-status patch', async () => {
    repo.findById.mockResolvedValue(fakeContact())
    repo.update.mockResolvedValue(fakeContact({ notes: 'n' }))
    await contactsService.update('u1', 'c1', { notes: 'n' })
    expect(timeline.addAutoEntry).not.toHaveBeenCalled()
  })
  it('does not emit when reverting to NO_RESPONSE', async () => {
    repo.findById.mockResolvedValue(fakeContact({ status: 'HEARD_BACK' }))
    repo.update.mockResolvedValue(fakeContact({ status: 'NO_RESPONSE' }))
    await contactsService.update('u1', 'c1', { status: 'NO_RESPONSE' })
    expect(timeline.addAutoEntry).not.toHaveBeenCalled()
  })
  it('throws NOT_FOUND when missing', async () => {
    repo.findById.mockResolvedValue(null)
    await expect(contactsService.update('u1', 'cX', { notes: 'n' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('contactsService.remove', () => {
  it('returns the deleted id and emits no event', async () => {
    repo.remove.mockResolvedValue(true)
    expect(await contactsService.remove('u1', 'c1')).toEqual({ id: 'c1' })
    expect(timeline.addAutoEntry).not.toHaveBeenCalled()
  })
  it('throws NOT_FOUND when missing', async () => {
    repo.remove.mockResolvedValue(false)
    await expect(contactsService.remove('u1', 'cX')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
