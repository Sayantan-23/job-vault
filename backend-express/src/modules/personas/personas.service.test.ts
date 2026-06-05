import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./personas.repository.js', () => ({
  personasRepository: {
    create: vi.fn(), countForUser: vi.fn(), listForUser: vi.fn(), findById: vi.fn(), update: vi.fn(), remove: vi.fn(),
  },
}))
vi.mock('@/modules/ai/gemini.service.js', () => ({
  geminiService: { isAiEnabled: vi.fn(), generateStructured: vi.fn(), generateText: vi.fn() },
}))

import { personasRepository } from './personas.repository.js'
import { geminiService } from '@/modules/ai/gemini.service.js'
import { personasService } from './personas.service.js'
import type { PersonaRow } from '@/db/schema/personas.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'

const repo = vi.mocked(personasRepository)
const ai = vi.mocked(geminiService)
const DATA: ResumeContent = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }
function fakePersona(over: Partial<PersonaRow> = {}): PersonaRow {
  return { id: 'p1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', name: 'Backend', data: DATA, rawInput: null, ...over }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['DATABASE_URL'] = 'postgres://x:x@x:5432/x'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  process.env['LOG_LEVEL'] = 'silent'
  process.env['MAX_PERSONAS'] = '5'
})

describe('personasService.create', () => {
  it('503s when AI is disabled', async () => {
    ai.isAiEnabled.mockReturnValue(false)
    await expect(personasService.create('u1', { name: 'B', inputs: { freeText: 'x' } })).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' })
  })

  it('rejects when the cap is reached', async () => {
    ai.isAiEnabled.mockReturnValue(true)
    repo.countForUser.mockResolvedValue(5)
    await expect(personasService.create('u1', { name: 'B', inputs: { freeText: 'x' } })).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  it('structures with AI and saves', async () => {
    ai.isAiEnabled.mockReturnValue(true)
    repo.countForUser.mockResolvedValue(0)
    ai.generateStructured.mockResolvedValue(DATA)
    repo.create.mockResolvedValue(fakePersona())
    const out = await personasService.create('u1', { name: 'Backend', inputs: { pastedResume: 'RESUME' } })
    expect(ai.generateStructured).toHaveBeenCalled()
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', name: 'Backend', data: DATA, rawInput: 'RESUME' }))
    expect(out.id).toBe('p1')
  })
})

describe('personasService.update / get / remove', () => {
  it('NOT_FOUND on missing update', async () => {
    repo.update.mockResolvedValue(null)
    await expect(personasService.update('u1', 'x', { name: 'Z' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
  it('NOT_FOUND on missing get', async () => {
    repo.findById.mockResolvedValue(null)
    await expect(personasService.get('u1', 'x')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
  it('NOT_FOUND on missing remove', async () => {
    repo.remove.mockResolvedValue(false)
    await expect(personasService.remove('u1', 'x')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
