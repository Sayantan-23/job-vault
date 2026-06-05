import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./resumes.repository.js', () => ({
  resumesRepository: { create: vi.fn(), listForUser: vi.fn(), findById: vi.fn(), update: vi.fn(), remove: vi.fn() },
}))
vi.mock('@/modules/personas/personas.repository.js', () => ({ personasRepository: { findById: vi.fn() } }))
vi.mock('@/modules/jobs/jobs.repository.js', () => ({ jobsRepository: { findById: vi.fn() } }))
vi.mock('@/modules/ai/gemini.service.js', () => ({ geminiService: { isAiEnabled: vi.fn(() => true), generateStructured: vi.fn() } }))
vi.mock('@/modules/ai/ai.rate-limit.js', () => ({ assertWithinRateLimit: vi.fn() }))

import { resumesRepository } from './resumes.repository.js'
import { personasRepository } from '@/modules/personas/personas.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'
import { geminiService } from '@/modules/ai/gemini.service.js'
import { assertWithinRateLimit } from '@/modules/ai/ai.rate-limit.js'
import { resumesService } from './resumes.service.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'

const repo = vi.mocked(resumesRepository)
const personas = vi.mocked(personasRepository)
const jobs = vi.mocked(jobsRepository)
const ai = vi.mocked(geminiService)
const rl = vi.mocked(assertWithinRateLimit)
const C: ResumeContent = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }
const persona = { id: 'p1', userId: 'u1', name: 'Backend', data: C, rawInput: null, createdAt: new Date(), updatedAt: new Date() }
const resumeRow = { id: 'res1', userId: 'u1', personaId: 'p1', jobId: null, title: 'Backend', instructions: null, content: C, createdAt: new Date(), updatedAt: new Date() }

beforeEach(() => {
  vi.clearAllMocks()
  ai.isAiEnabled.mockReturnValue(true)
  rl.mockResolvedValue(undefined)
})

describe('resumesService.generate', () => {
  it('503s when AI disabled', async () => {
    ai.isAiEnabled.mockReturnValue(false)
    await expect(resumesService.generate('u1', { personaId: 'p1' })).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' })
  })
  it('NOT_FOUND when the persona is not owned (and does NOT spend rate limit)', async () => {
    personas.findById.mockResolvedValue(null)
    await expect(resumesService.generate('u1', { personaId: 'pX' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(rl).not.toHaveBeenCalled()
  })
  it('NOT_FOUND when a jobId is given but not owned', async () => {
    personas.findById.mockResolvedValue(persona)
    jobs.findById.mockResolvedValue(null)
    await expect(resumesService.generate('u1', { personaId: 'p1', jobId: 'jX' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
  it('persona-only: rate-limits, generates, saves with persona-name title', async () => {
    personas.findById.mockResolvedValue(persona)
    ai.generateStructured.mockResolvedValue(C)
    repo.create.mockResolvedValue(resumeRow)
    const out = await resumesService.generate('u1', { personaId: 'p1' })
    expect(rl).toHaveBeenCalledWith('u1')
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', personaId: 'p1', jobId: null, title: 'Backend', content: C }))
    expect(out.id).toBe('res1')
  })
})

describe('resumesService.getTex', () => {
  it('derives .tex from a saved résumé', async () => {
    repo.findById.mockResolvedValue(resumeRow)
    const tex = await resumesService.getTex('u1', 'res1')
    expect(tex).toContain('\\documentclass')
  })
  it('NOT_FOUND on a missing résumé', async () => {
    repo.findById.mockResolvedValue(null)
    await expect(resumesService.getTex('u1', 'x')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
