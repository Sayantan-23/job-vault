import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import type { PersonaRow } from '@/db/schema/personas.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'

vi.mock('./personas.repository.js', () => ({
  personasRepository: {
    create: vi.fn(), countForUser: vi.fn(), listForUser: vi.fn(), findById: vi.fn(), update: vi.fn(), remove: vi.fn(),
  },
}))
vi.mock('@/modules/ai/gemini.service.js', () => ({
  geminiService: { isAiEnabled: vi.fn(() => true), generateStructured: vi.fn(), generateText: vi.fn() },
}))

import { personasRepository } from './personas.repository.js'
import { geminiService } from '@/modules/ai/gemini.service.js'

const repo = vi.mocked(personasRepository)
const ai = vi.mocked(geminiService)
let app: Express
let cookie: string
const DATA: ResumeContent = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }
function fakePersona(over: Partial<PersonaRow> = {}): PersonaRow {
  return { id: 'p1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', name: 'Backend', data: DATA, rawInput: null, ...over }
}

beforeAll(async () => {
  process.env['NODE_ENV'] = 'test'
  process.env['PORT'] = '3000'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['DATABASE_URL'] = 'postgres://x:x@x:5432/x'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  process.env['JWT_ACCESS_EXPIRY'] = '15m'
  process.env['JWT_REFRESH_EXPIRY'] = '7d'
  process.env['LOG_LEVEL'] = 'silent'
  process.env['MAX_PERSONAS'] = '5'
  app = (await import('@/app.js')).createApp()
  const { signAccessToken } = await import('@/modules/auth/auth.tokens.js')
  cookie = `accessToken=${signAccessToken({ id: 'u1', email: 'a@b.c' })}`
})

beforeEach(() => {
  vi.clearAllMocks()
  ai.isAiEnabled.mockReturnValue(true)
})

describe('personas routes', () => {
  it('401s without a cookie', async () => {
    expect((await request(app).get('/api/personas')).status).toBe(401)
  })
  it('lists personas', async () => {
    repo.listForUser.mockResolvedValue([fakePersona()])
    const res = await request(app).get('/api/personas').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
  })
  it('creates a persona (201)', async () => {
    repo.countForUser.mockResolvedValue(0)
    ai.generateStructured.mockResolvedValue(DATA)
    repo.create.mockResolvedValue(fakePersona())
    const res = await request(app).post('/api/personas').set('Cookie', [cookie]).send({ name: 'Backend', inputs: { pastedResume: 'R' } })
    expect(res.status).toBe(201)
    expect(res.body.data.id).toBe('p1')
  })
  it('400s on empty inputs', async () => {
    const res = await request(app).post('/api/personas').set('Cookie', [cookie]).send({ name: 'Backend', inputs: {} })
    expect(res.status).toBe(400)
  })
  it('409s on the cap', async () => {
    repo.countForUser.mockResolvedValue(5)
    const res = await request(app).post('/api/personas').set('Cookie', [cookie]).send({ name: 'Backend', inputs: { freeText: 'x' } })
    expect(res.status).toBe(409)
  })
  it('503s when AI is disabled', async () => {
    ai.isAiEnabled.mockReturnValue(false)
    const res = await request(app).post('/api/personas').set('Cookie', [cookie]).send({ name: 'Backend', inputs: { freeText: 'x' } })
    expect(res.status).toBe(503)
  })
  it('patches a persona', async () => {
    repo.update.mockResolvedValue(fakePersona({ name: 'Full-stack' }))
    const res = await request(app).patch('/api/personas/p1').set('Cookie', [cookie]).send({ name: 'Full-stack' })
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Full-stack')
  })
  it('404s patching a missing persona', async () => {
    repo.update.mockResolvedValue(null)
    const res = await request(app).patch('/api/personas/x').set('Cookie', [cookie]).send({ name: 'Z' })
    expect(res.status).toBe(404)
  })
  it('deletes a persona (204)', async () => {
    repo.remove.mockResolvedValue(true)
    const res = await request(app).delete('/api/personas/p1').set('Cookie', [cookie])
    expect(res.status).toBe(204)
  })
})
