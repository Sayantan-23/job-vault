import { describe, it, expect, vi, beforeEach } from 'vitest'

// jobs.service imports the real logger, whose module load validates env via
// getEnv(). Set the required vars before any import evaluates (vi.hoisted runs
// before hoisted imports) so the logger constructs without throwing.
vi.hoisted(() => {
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['DATABASE_URL'] = 'postgres://x:x@x:5432/x'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  process.env['LOG_LEVEL'] = 'silent'
})

vi.mock('./jobs.repository.js', () => ({
  jobsRepository: {
    nextKanbanOrder: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
    move: vi.fn(),
    remove: vi.fn(),
  },
}))
vi.mock('./scraper.js', () => ({ scrapeUrl: vi.fn() }))
vi.mock('@/modules/timeline/timeline.service.js', () => ({
  timelineService: { addAutoEntry: vi.fn() },
}))

import { jobsRepository } from './jobs.repository.js'
import { scrapeUrl } from './scraper.js'
import { timelineService } from '@/modules/timeline/timeline.service.js'
import { jobsService } from './jobs.service.js'
import type { JobRow } from '@/db/schema/jobs.js'

const repo = vi.mocked(jobsRepository)
const scrape = vi.mocked(scrapeUrl)
const timeline = vi.mocked(timelineService)

function fakeJob(over: Record<string, unknown> = {}): JobRow {
  return {
    id: 'j1',
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 'u1',
    title: 'SWE',
    company: 'Acme',
    location: null,
    salaryRange: null,
    sourceUrl: null,
    snapshotMarkdown: null,
    status: 'WISHLIST',
    kanbanOrder: 1,
    lastActivityAt: new Date(),
    ghostDays: 0,
    notes: null,
    ...over,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('jobsService.create', () => {
  it('defaults status to WISHLIST and assigns the next kanbanOrder', async () => {
    repo.nextKanbanOrder.mockResolvedValue(3)
    repo.create.mockResolvedValue(fakeJob({ kanbanOrder: 3 }))
    const job = await jobsService.create('u1', { title: 'SWE', company: 'Acme' })
    expect(repo.nextKanbanOrder).toHaveBeenCalledWith('u1', 'WISHLIST')
    const values = repo.create.mock.calls[0]?.[0] as { kanbanOrder: number; userId: string }
    expect(values.kanbanOrder).toBe(3)
    expect(values.userId).toBe('u1')
    expect(job.id).toBe('j1')
  })

  it('emits a "Job added to vault" auto-event after create', async () => {
    repo.nextKanbanOrder.mockResolvedValue(1)
    repo.create.mockResolvedValue(fakeJob({ status: 'WISHLIST' }))
    await jobsService.create('u1', { title: 'SWE', company: 'Acme' })
    expect(timeline.addAutoEntry).toHaveBeenCalledWith({
      userId: 'u1',
      jobId: 'j1',
      title: 'Job added to vault',
      description: 'Added to WISHLIST column',
    })
  })

  it('lets a caller override the auto-event title (extension attribution)', async () => {
    repo.nextKanbanOrder.mockResolvedValue(1)
    repo.create.mockResolvedValue(fakeJob({ status: 'WISHLIST' }))
    await jobsService.create('u1', { title: 'SWE', company: 'Acme' }, { autoEntryTitle: 'Added via Chrome Extension' })
    expect(timeline.addAutoEntry).toHaveBeenCalledWith({
      userId: 'u1',
      jobId: 'j1',
      title: 'Added via Chrome Extension',
      description: 'Added to WISHLIST column',
    })
  })
})

describe('jobsService.get', () => {
  it('throws NOT_FOUND when the job is missing or not owned', async () => {
    repo.findById.mockResolvedValue(null)
    await expect(jobsService.get('u1', 'missing')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('jobsService.update / move / remove', () => {
  it('throws NOT_FOUND from update when repo returns null', async () => {
    repo.findById.mockResolvedValue(fakeJob())
    repo.update.mockResolvedValue(null)
    await expect(jobsService.update('u1', 'x', { title: 'y' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
  it('throws NOT_FOUND from move when repo returns null', async () => {
    repo.findById.mockResolvedValue(fakeJob())
    repo.move.mockResolvedValue(null)
    await expect(jobsService.move('u1', 'x', { status: 'OFFER', kanbanOrder: 1 })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })
  it('throws NOT_FOUND from remove when repo returns false', async () => {
    repo.remove.mockResolvedValue(false)
    await expect(jobsService.remove('u1', 'x')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('emits a status-change auto-event from update when status differs', async () => {
    repo.findById.mockResolvedValue(fakeJob({ status: 'WISHLIST' }))
    repo.update.mockResolvedValue(fakeJob({ status: 'APPLIED' }))
    await jobsService.update('u1', 'j1', { status: 'APPLIED' })
    expect(timeline.addAutoEntry).toHaveBeenCalledWith({
      userId: 'u1',
      jobId: 'j1',
      title: 'Status changed to APPLIED',
      description: 'Moved from WISHLIST to APPLIED',
    })
  })

  it('does NOT emit an auto-event from update when status is unchanged', async () => {
    repo.findById.mockResolvedValue(fakeJob({ status: 'WISHLIST' }))
    repo.update.mockResolvedValue(fakeJob({ status: 'WISHLIST', title: 'Renamed' }))
    await jobsService.update('u1', 'j1', { title: 'Renamed' })
    expect(timeline.addAutoEntry).not.toHaveBeenCalled()
  })

  it('emits a status-change auto-event from move when status differs', async () => {
    repo.findById.mockResolvedValue(fakeJob({ status: 'WISHLIST' }))
    repo.move.mockResolvedValue(fakeJob({ status: 'OFFER', kanbanOrder: 3 }))
    await jobsService.move('u1', 'j1', { status: 'OFFER', kanbanOrder: 3 })
    expect(timeline.addAutoEntry).toHaveBeenCalledWith({
      userId: 'u1',
      jobId: 'j1',
      title: 'Status changed to OFFER',
      description: 'Moved from WISHLIST to OFFER',
    })
  })

  it('does NOT emit an auto-event from move when status is unchanged', async () => {
    repo.findById.mockResolvedValue(fakeJob({ status: 'OFFER' }))
    repo.move.mockResolvedValue(fakeJob({ status: 'OFFER', kanbanOrder: 9 }))
    await jobsService.move('u1', 'j1', { status: 'OFFER', kanbanOrder: 9 })
    expect(timeline.addAutoEntry).not.toHaveBeenCalled()
  })
})

describe('jobsService.scrape', () => {
  it('returns the scrape result on success', async () => {
    scrape.mockResolvedValue({ title: 'T', company: 'C', snapshotMarkdown: 'md', status: 'ok', source: 'static' })
    expect(await jobsService.scrape('u1', 'https://x.com/j')).toMatchObject({ title: 'T' })
  })
  it('wraps scraper errors as VALIDATION_ERROR', async () => {
    scrape.mockRejectedValue(new Error('timeout'))
    await expect(jobsService.scrape('u1', 'https://x.com/j')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })
})
