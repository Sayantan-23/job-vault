import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.hoisted(() => {
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['DATABASE_URL'] = 'postgres://x:x@x:5432/x'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  process.env['LOG_LEVEL'] = 'silent'
})

vi.mock('@/modules/jobs/jobs.repository.js', () => ({ jobsRepository: { findBySourceUrl: vi.fn() } }))
vi.mock('@/modules/jobs/jobs.service.js', () => ({ jobsService: { create: vi.fn(), scrape: vi.fn() } }))
vi.mock('@/modules/auth/auth.repository.js', () => ({ authRepository: { findById: vi.fn() } }))
// Stub normalization so dedup is deterministic without pulling the scrape stack.
vi.mock('@/modules/jobs/scraper.js', () => ({
  normalizeJobUrl: (u: string) =>
    u.includes('currentJobId=123') ? 'https://www.linkedin.com/jobs/view/123' : u,
}))

import { jobsRepository } from '@/modules/jobs/jobs.repository.js'
import { jobsService } from '@/modules/jobs/jobs.service.js'
import { authRepository } from '@/modules/auth/auth.repository.js'
import { extensionService } from './extension.service.js'
import type { JobRow } from '@/db/schema/jobs.js'
import type { UserRow } from '@/db/schema/users.js'

const jobsRepo = vi.mocked(jobsRepository)
const jobsSvc = vi.mocked(jobsService)
const auth = vi.mocked(authRepository)
const asType = <T>(value: unknown): T => value as T
function fakeJob(over: Partial<JobRow> = {}): JobRow {
  return asType<JobRow>({
    id: 'j1',
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
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  })
}

beforeEach(() => vi.clearAllMocks())

describe('extensionService', () => {
  describe('verifyKey', () => {
    it('returns the connected account email', async () => {
      auth.findById.mockResolvedValue(asType<UserRow>({ id: 'u1', email: 'a@b.c' }))
      expect(await extensionService.verifyKey('u1')).toEqual({ ok: true, user: { email: 'a@b.c' } })
    })
    it('throws UNAUTHORIZED when the account is gone', async () => {
      auth.findById.mockResolvedValue(null)
      await expect(extensionService.verifyKey('u1')).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })
  })

  describe('checkUrl', () => {
    it('normalizes the url before the dedup lookup', async () => {
      jobsRepo.findBySourceUrl.mockResolvedValue(null)
      const out = await extensionService.checkUrl('u1', 'https://www.linkedin.com/jobs/search?currentJobId=123')
      expect(jobsRepo.findBySourceUrl).toHaveBeenCalledWith('u1', 'https://www.linkedin.com/jobs/view/123')
      expect(out).toEqual({ isDuplicate: false })
    })
    it('returns the existing job summary on a hit', async () => {
      jobsRepo.findBySourceUrl.mockResolvedValue(fakeJob({ id: 'dup', title: 'X', company: 'Y', status: 'APPLIED' }))
      expect(await extensionService.checkUrl('u1', 'https://x.com/j')).toEqual({
        isDuplicate: true,
        job: { id: 'dup', title: 'X', company: 'Y', status: 'APPLIED' },
      })
    })
  })

  describe('quickCreateJob', () => {
    it('dedups by normalized sourceUrl and never creates', async () => {
      jobsRepo.findBySourceUrl.mockResolvedValue(fakeJob({ id: 'dup', title: 'X', company: 'Y', status: 'APPLIED' }))
      const out = await extensionService.quickCreateJob('u1', {
        title: 'T',
        company: 'C',
        sourceUrl: 'https://www.linkedin.com/jobs/search?currentJobId=123',
      })
      expect(jobsRepo.findBySourceUrl).toHaveBeenCalledWith('u1', 'https://www.linkedin.com/jobs/view/123')
      expect(out).toEqual({ id: 'dup', title: 'X', company: 'Y', status: 'APPLIED', isDuplicate: true })
      expect(jobsSvc.create).not.toHaveBeenCalled()
    })

    it('creates with the extension auto-entry, normalized url, and description→snapshot', async () => {
      jobsRepo.findBySourceUrl.mockResolvedValue(null)
      jobsSvc.create.mockResolvedValue(fakeJob({ id: 'new', title: 'T', company: 'C', status: 'WISHLIST' }))
      const out = await extensionService.quickCreateJob('u1', {
        title: 'T',
        company: 'C',
        sourceUrl: 'https://x.com/job',
        description: 'JD body',
      })
      expect(jobsSvc.create).toHaveBeenCalledWith(
        'u1',
        { title: 'T', company: 'C', sourceUrl: 'https://x.com/job', snapshotMarkdown: 'JD body' },
        { autoEntryTitle: 'Added via Chrome Extension' },
      )
      expect(out).toEqual({ id: 'new', title: 'T', company: 'C', status: 'WISHLIST', isDuplicate: false })
    })

    it('prefers an explicit snapshotMarkdown over description', async () => {
      jobsRepo.findBySourceUrl.mockResolvedValue(null)
      jobsSvc.create.mockResolvedValue(fakeJob())
      await extensionService.quickCreateJob('u1', {
        title: 'T',
        company: 'C',
        snapshotMarkdown: 'MD',
        description: 'ignored',
      })
      expect(jobsSvc.create).toHaveBeenCalledWith(
        'u1',
        { title: 'T', company: 'C', snapshotMarkdown: 'MD' },
        { autoEntryTitle: 'Added via Chrome Extension' },
      )
    })
  })

  describe('scrape', () => {
    it('delegates to jobsService.scrape', async () => {
      jobsSvc.scrape.mockResolvedValue(asType('SCRAPE_RESULT'))
      expect(await extensionService.scrape('u1', 'https://x.com/j')).toBe('SCRAPE_RESULT')
      expect(jobsSvc.scrape).toHaveBeenCalledWith('u1', 'https://x.com/j')
    })
  })
})
