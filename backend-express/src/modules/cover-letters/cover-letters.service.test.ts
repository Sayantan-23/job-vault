import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppError } from '@/shared/errors.js'

vi.mock('./cover-letters.repository.js', () => ({
  coverLettersRepository: { create: vi.fn(), listForUser: vi.fn(), findById: vi.fn(), update: vi.fn(), remove: vi.fn() },
}))
vi.mock('@/modules/personas/personas.repository.js', () => ({ personasRepository: { findById: vi.fn() } }))
vi.mock('@/modules/jobs/jobs.repository.js', () => ({ jobsRepository: { findById: vi.fn() } }))
vi.mock('@/modules/ai/gemini.service.js', () => ({ geminiService: { isAiEnabled: vi.fn(() => true), generateText: vi.fn() } }))
vi.mock('@/modules/ai/ai.rate-limit.js', () => ({ assertWithinRateLimit: vi.fn() }))
vi.mock('@/modules/profile/profile.service.js', () => ({ profileService: { getSavedBasics: vi.fn() } }))
vi.mock('@/modules/ai/ai.prompts.js', () => ({
  buildCoverLetterPrompt: vi.fn(() => 'PROMPT'),
  buildRefineCoverLetterPrompt: vi.fn(() => 'REFINE_PROMPT'),
}))
vi.mock('@/modules/ai/ai-usage.repository.js', () => ({ aiUsageRepository: { recordUsageEvent: vi.fn() } }))

import { coverLettersRepository } from './cover-letters.repository.js'
import { personasRepository } from '@/modules/personas/personas.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'
import { geminiService } from '@/modules/ai/gemini.service.js'
import { assertWithinRateLimit } from '@/modules/ai/ai.rate-limit.js'
import { profileService } from '@/modules/profile/profile.service.js'
import { buildCoverLetterPrompt, buildRefineCoverLetterPrompt } from '@/modules/ai/ai.prompts.js'
import { aiUsageRepository } from '@/modules/ai/ai-usage.repository.js'
import { coverLettersService } from './cover-letters.service.js'
import type { ProfileBasics, ProfileContent } from '@/shared/profile-content.schema.js'

const repo = vi.mocked(coverLettersRepository)
const personas = vi.mocked(personasRepository)
const jobs = vi.mocked(jobsRepository)
const ai = vi.mocked(geminiService)
const rl = vi.mocked(assertWithinRateLimit)
const profile = vi.mocked(profileService)
const prompt = vi.mocked(buildCoverLetterPrompt)
const refinePrompt = vi.mocked(buildRefineCoverLetterPrompt)
const usage = vi.mocked(aiUsageRepository)
const P: ProfileContent = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }
const persona = { id: 'p1', userId: 'u1', name: 'Backend', data: P, rawInput: null, createdAt: new Date(), updatedAt: new Date() }
const job = { id: 'j1', userId: 'u1', title: 'SWE', company: 'Acme', location: null, salaryRange: null, sourceUrl: null, snapshotMarkdown: 'Go', status: 'APPLIED' as const, kanbanOrder: 1, lastActivityAt: new Date(), ghostDays: 0, notes: null, createdAt: new Date(), updatedAt: new Date() }
const row = { id: 'cl1', userId: 'u1', jobId: 'j1', adhocJob: null, personaId: 'p1', title: 'Acme', instructions: null, bodyMarkdown: 'Dear…', createdAt: new Date(), updatedAt: new Date() }

beforeEach(() => {
  vi.clearAllMocks()
  ai.isAiEnabled.mockReturnValue(true)
  rl.mockResolvedValue(undefined)
  profile.getSavedBasics.mockResolvedValue(null)
  prompt.mockReturnValue('PROMPT')
  refinePrompt.mockReturnValue('REFINE_PROMPT')
})

describe('coverLettersService.generate', () => {
  it('503 when AI disabled', async () => {
    ai.isAiEnabled.mockReturnValue(false)
    await expect(coverLettersService.generate('u1', { jobId: 'j1', personaId: 'p1' })).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' })
  })
  it('NOT_FOUND when job not owned (and does NOT spend rate limit)', async () => {
    personas.findById.mockResolvedValue(persona)
    jobs.findById.mockResolvedValue(null)
    await expect(coverLettersService.generate('u1', { jobId: 'jX', personaId: 'p1' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(rl).not.toHaveBeenCalled()
  })
  it('NOT_FOUND when persona not owned', async () => {
    jobs.findById.mockResolvedValue(job)
    personas.findById.mockResolvedValue(null)
    await expect(coverLettersService.generate('u1', { jobId: 'j1', personaId: 'pX' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
  it('rate-limits after ownership, generates markdown, saves', async () => {
    jobs.findById.mockResolvedValue(job)
    personas.findById.mockResolvedValue(persona)
    ai.generateText.mockResolvedValue('Dear hiring manager,\n\nI am excited…')
    repo.create.mockResolvedValue(row)
    const out = await coverLettersService.generate('u1', { jobId: 'j1', personaId: 'p1' })
    expect(rl).toHaveBeenCalledWith('u1')
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', jobId: 'j1', personaId: 'p1', bodyMarkdown: expect.stringContaining('Dear') }))
    expect(out.id).toBe('cl1')
  })
  it('prompts with the master-profile basics merged over the persona data when saved', async () => {
    const masterBasics: ProfileBasics = { name: 'Master Name', email: 'master@example.com', phone: '+1 555', links: [] }
    jobs.findById.mockResolvedValue(job)
    personas.findById.mockResolvedValue(persona)
    profile.getSavedBasics.mockResolvedValue(masterBasics)
    ai.generateText.mockResolvedValue('Dear…')
    repo.create.mockResolvedValue(row)
    await coverLettersService.generate('u1', { jobId: 'j1', personaId: 'p1' })
    expect(profile.getSavedBasics).toHaveBeenCalledWith('u1')
    expect(prompt).toHaveBeenCalledWith({ ...P, basics: masterBasics }, { title: 'SWE', company: 'Acme', snapshot: 'Go' }, undefined)
  })
  it("prompts with the persona's own basics when no master-profile basics are saved", async () => {
    jobs.findById.mockResolvedValue(job)
    personas.findById.mockResolvedValue(persona)
    profile.getSavedBasics.mockResolvedValue(null)
    ai.generateText.mockResolvedValue('Dear…')
    repo.create.mockResolvedValue(row)
    await coverLettersService.generate('u1', { jobId: 'j1', personaId: 'p1' })
    expect(prompt).toHaveBeenCalledWith(P, { title: 'SWE', company: 'Acme', snapshot: 'Go' }, undefined)
  })
})

describe('coverLettersService.generate — adhoc (pasted JD)', () => {
  const adhocInput = { personaId: 'p1', job: { title: 'Staff Eng', company: 'Acme', description: 'JD text' } }

  it('persists jobId null + adhocJob without touching jobsRepository; prompt snapshot is the description', async () => {
    personas.findById.mockResolvedValue(persona)
    ai.generateText.mockResolvedValue('Dear hiring manager,')
    repo.create.mockResolvedValue({ ...row, jobId: null, adhocJob: adhocInput.job })
    const out = await coverLettersService.generate('u1', adhocInput)
    expect(jobs.findById).not.toHaveBeenCalled()
    expect(prompt).toHaveBeenCalledWith(P, { title: 'Staff Eng', company: 'Acme', snapshot: 'JD text' }, undefined)
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        jobId: null,
        adhocJob: { title: 'Staff Eng', company: 'Acme', description: 'JD text' },
        personaId: 'p1',
        title: 'Acme — cover letter',
      }),
    )
    expect(out.jobId).toBeNull()
  })

  it('normalizes a blank description away: no key on the stored adhocJob, prompt snapshot null', async () => {
    personas.findById.mockResolvedValue(persona)
    ai.generateText.mockResolvedValue('Dear…')
    repo.create.mockResolvedValue({ ...row, jobId: null, adhocJob: { title: 'Staff Eng', company: 'Acme' } })
    await coverLettersService.generate('u1', { personaId: 'p1', job: { title: 'Staff Eng', company: 'Acme', description: '   ' } })
    expect(prompt).toHaveBeenCalledWith(P, { title: 'Staff Eng', company: 'Acme', snapshot: null }, undefined)
    const created = repo.create.mock.calls[0]![0]
    expect(created.adhocJob).toEqual({ title: 'Staff Eng', company: 'Acme' })
    expect(created.adhocJob).not.toHaveProperty('description')
  })

  it('NOT_FOUND when persona not owned (and does NOT spend rate limit)', async () => {
    personas.findById.mockResolvedValue(null)
    await expect(coverLettersService.generate('u1', adhocInput)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(rl).not.toHaveBeenCalled()
    expect(ai.generateText).not.toHaveBeenCalled()
  })

  it('spends the rate limit before Gemini and merges saved master basics over the persona', async () => {
    const masterBasics: ProfileBasics = { name: 'Master Name', email: 'master@example.com', links: [] }
    const order: string[] = []
    personas.findById.mockResolvedValue(persona)
    profile.getSavedBasics.mockResolvedValue(masterBasics)
    rl.mockImplementation(async () => {
      order.push('rate-limit')
    })
    ai.generateText.mockImplementation(async () => {
      order.push('gemini')
      return 'Dear…'
    })
    repo.create.mockResolvedValue({ ...row, jobId: null, adhocJob: adhocInput.job })
    await coverLettersService.generate('u1', adhocInput)
    expect(order).toEqual(['rate-limit', 'gemini'])
    expect(prompt).toHaveBeenCalledWith({ ...P, basics: masterBasics }, { title: 'Staff Eng', company: 'Acme', snapshot: 'JD text' }, undefined)
  })

  it('clamps the generated title to 200 chars for a very long company', async () => {
    const longCompany = 'C'.repeat(300)
    personas.findById.mockResolvedValue(persona)
    ai.generateText.mockResolvedValue('Dear…')
    repo.create.mockResolvedValue({ ...row, jobId: null, adhocJob: { title: 'T', company: longCompany } })
    await coverLettersService.generate('u1', { personaId: 'p1', job: { title: 'T', company: longCompany } })
    const created = repo.create.mock.calls[0]![0]
    expect(created.title).toHaveLength(200)
  })
})

describe('coverLettersService CRUD', () => {
  it('NOT_FOUND on missing get/update/remove', async () => {
    repo.findById.mockResolvedValue(null)
    await expect(coverLettersService.get('u1', 'x')).rejects.toMatchObject({ code: 'NOT_FOUND' })
    repo.update.mockResolvedValue(null)
    await expect(coverLettersService.update('u1', 'x', { title: 'Z' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
    repo.remove.mockResolvedValue(false)
    await expect(coverLettersService.remove('u1', 'x')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('coverLettersService.refine', () => {
  it('503 when AI disabled', async () => {
    ai.isAiEnabled.mockReturnValue(false)
    await expect(coverLettersService.refine('u1', 'cl1', { action: 'humanize' })).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
    })
    expect(repo.findById).not.toHaveBeenCalled()
  })

  it('NOT_FOUND for an unowned/unknown id and does NOT spend the rate limit', async () => {
    repo.findById.mockResolvedValue(null)
    await expect(coverLettersService.refine('u1', 'cX', { action: 'humanize' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    expect(rl).not.toHaveBeenCalled()
    expect(ai.generateText).not.toHaveBeenCalled()
    expect(usage.recordUsageEvent).not.toHaveBeenCalled()
  })

  it('rate-limits after ownership, generates from the refine prompt, records usage, and returns the candidate without persisting', async () => {
    repo.findById.mockResolvedValue(row)
    ai.generateText.mockResolvedValue('Refined letter body')
    const out = await coverLettersService.refine('u1', 'cl1', { action: 'humanize' })
    expect(repo.findById).toHaveBeenCalledWith('u1', 'cl1')
    expect(rl).toHaveBeenCalledWith('u1')
    expect(refinePrompt).toHaveBeenCalledWith(row.bodyMarkdown, 'humanize', undefined)
    expect(ai.generateText).toHaveBeenCalledWith('REFINE_PROMPT')
    expect(usage.recordUsageEvent).toHaveBeenCalledWith('u1', 'cover_letter_refine')
    expect(out).toEqual({ bodyMarkdown: 'Refined letter body' })
    expect(repo.update).not.toHaveBeenCalled()
  })

  it('passes custom instructions through to the refine prompt', async () => {
    repo.findById.mockResolvedValue(row)
    ai.generateText.mockResolvedValue('Refined')
    await coverLettersService.refine('u1', 'cl1', { action: 'custom', instructions: 'make it punchier' })
    expect(refinePrompt).toHaveBeenCalledWith(row.bodyMarkdown, 'custom', 'make it punchier')
  })

  it('does not record a usage event when the rate limit rejects', async () => {
    repo.findById.mockResolvedValue(row)
    rl.mockRejectedValue(new AppError('RATE_LIMITED', 'limit reached'))
    await expect(coverLettersService.refine('u1', 'cl1', { action: 'humanize' })).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    })
    expect(ai.generateText).not.toHaveBeenCalled()
    expect(usage.recordUsageEvent).not.toHaveBeenCalled()
  })
})
