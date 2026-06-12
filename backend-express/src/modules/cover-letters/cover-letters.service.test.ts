import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./cover-letters.repository.js', () => ({
  coverLettersRepository: { create: vi.fn(), listForUser: vi.fn(), findById: vi.fn(), update: vi.fn(), remove: vi.fn() },
}))
vi.mock('@/modules/personas/personas.repository.js', () => ({ personasRepository: { findById: vi.fn() } }))
vi.mock('@/modules/jobs/jobs.repository.js', () => ({ jobsRepository: { findById: vi.fn() } }))
vi.mock('@/modules/ai/gemini.service.js', () => ({ geminiService: { isAiEnabled: vi.fn(() => true), generateText: vi.fn() } }))
vi.mock('@/modules/ai/ai.rate-limit.js', () => ({ assertWithinRateLimit: vi.fn() }))
vi.mock('@/modules/profile/profile.service.js', () => ({ profileService: { getSavedBasics: vi.fn() } }))
vi.mock('@/modules/ai/ai.prompts.js', () => ({ buildCoverLetterPrompt: vi.fn(() => 'PROMPT') }))

import { coverLettersRepository } from './cover-letters.repository.js'
import { personasRepository } from '@/modules/personas/personas.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'
import { geminiService } from '@/modules/ai/gemini.service.js'
import { assertWithinRateLimit } from '@/modules/ai/ai.rate-limit.js'
import { profileService } from '@/modules/profile/profile.service.js'
import { buildCoverLetterPrompt } from '@/modules/ai/ai.prompts.js'
import { coverLettersService } from './cover-letters.service.js'
import type { ProfileBasics, ProfileContent } from '@/shared/profile-content.schema.js'

const repo = vi.mocked(coverLettersRepository)
const personas = vi.mocked(personasRepository)
const jobs = vi.mocked(jobsRepository)
const ai = vi.mocked(geminiService)
const rl = vi.mocked(assertWithinRateLimit)
const profile = vi.mocked(profileService)
const prompt = vi.mocked(buildCoverLetterPrompt)
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
})

describe('coverLettersService.generate', () => {
  it('503 when AI disabled', async () => {
    ai.isAiEnabled.mockReturnValue(false)
    await expect(coverLettersService.generate('u1', { jobId: 'j1', personaId: 'p1' })).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' })
  })
  it('NOT_FOUND when job not owned (and does NOT spend rate limit)', async () => {
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
