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
import type { ProfileContent } from '@/shared/profile-content.schema.js'

const repo = vi.mocked(personasRepository)
const ai = vi.mocked(geminiService)
const DATA: ProfileContent = {
  basics: { name: 'Ada', links: [{ label: 'GitHub', url: 'https://github.com/ada' }] },
  summary: 'Engineer',
  experience: [{ company: 'Acme', role: 'Dev', startDate: { month: 1, year: 2022 }, endDate: null, current: true, bullets: [] }],
  projects: [],
  skills: [],
  education: [],
}
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
  it('saves directly without any AI call (works with AI disabled)', async () => {
    ai.isAiEnabled.mockReturnValue(false)
    repo.countForUser.mockResolvedValue(0)
    repo.create.mockResolvedValue(fakePersona())
    const out = await personasService.create('u1', { name: 'Backend', data: DATA })
    expect(ai.generateStructured).not.toHaveBeenCalled()
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', name: 'Backend', rawInput: null }))
    expect(out.id).toBe('p1')
  })

  it('rejects when the cap is reached', async () => {
    repo.countForUser.mockResolvedValue(5)
    await expect(personasService.create('u1', { name: 'B', data: DATA })).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(repo.create).not.toHaveBeenCalled()
  })

  it('ensures ids on every entry and passes rawInput through', async () => {
    repo.countForUser.mockResolvedValue(0)
    repo.create.mockResolvedValue(fakePersona())
    await personasService.create('u1', { name: 'Backend', data: DATA, rawInput: 'RESUME TEXT' })
    const saved = repo.create.mock.calls[0]?.[0]
    expect(saved?.rawInput).toBe('RESUME TEXT')
    const data = saved?.data as ProfileContent
    expect(data.experience[0]?.id).toBeTruthy()
    expect(data.basics.links[0]?.id).toBeTruthy()
    // input object not mutated (ensureIds is pure)
    expect(DATA.experience[0]?.id).toBeUndefined()
  })

  it('keeps pre-existing ids stable', async () => {
    repo.countForUser.mockResolvedValue(0)
    repo.create.mockResolvedValue(fakePersona())
    const withId: ProfileContent = { ...DATA, experience: [{ ...DATA.experience[0]!, id: 'exp-1' }] }
    await personasService.create('u1', { name: 'Backend', data: withId })
    const data = repo.create.mock.calls[0]?.[0]?.data as ProfileContent
    expect(data.experience[0]?.id).toBe('exp-1')
  })
})

describe('personasService.update', () => {
  it('ensures ids when data is patched', async () => {
    repo.update.mockResolvedValue(fakePersona())
    await personasService.update('u1', 'p1', { data: DATA })
    const patch = repo.update.mock.calls[0]?.[2]
    expect((patch?.data as ProfileContent).experience[0]?.id).toBeTruthy()
  })
  it('NOT_FOUND on missing update', async () => {
    repo.update.mockResolvedValue(null)
    await expect(personasService.update('u1', 'x', { name: 'Z' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('personasService.get / remove', () => {
  it('NOT_FOUND on missing get', async () => {
    repo.findById.mockResolvedValue(null)
    await expect(personasService.get('u1', 'x')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
  it('NOT_FOUND on missing remove', async () => {
    repo.remove.mockResolvedValue(false)
    await expect(personasService.remove('u1', 'x')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
