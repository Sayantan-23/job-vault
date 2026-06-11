import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import type { CoverLetterRow } from '@/db/schema/cover-letters.js'

vi.mock('./cover-letters.repository.js', () => ({
  coverLettersRepository: { create: vi.fn(), listForUser: vi.fn(), findById: vi.fn(), update: vi.fn(), remove: vi.fn() },
}))
vi.mock('@/modules/personas/personas.repository.js', () => ({ personasRepository: { findById: vi.fn() } }))
vi.mock('@/modules/jobs/jobs.repository.js', () => ({ jobsRepository: { findById: vi.fn() } }))
vi.mock('@/modules/ai/gemini.service.js', () => ({ geminiService: { isAiEnabled: vi.fn(() => true), generateText: vi.fn() } }))
vi.mock('@/modules/ai/ai-usage.repository.js', () => ({ aiUsageRepository: { countRecentGenerations: vi.fn().mockResolvedValue(0) } }))
vi.mock('@/modules/profile/profile.repository.js', () => ({ profileRepository: { findByUserId: vi.fn().mockResolvedValue(null), upsert: vi.fn() } }))

import { coverLettersRepository } from './cover-letters.repository.js'
import { personasRepository } from '@/modules/personas/personas.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'
import { geminiService } from '@/modules/ai/gemini.service.js'

const repo = vi.mocked(coverLettersRepository)
const personas = vi.mocked(personasRepository)
const jobs = vi.mocked(jobsRepository)
const ai = vi.mocked(geminiService)
const UUID = '11111111-1111-1111-1111-111111111111'
function row(over: Partial<CoverLetterRow> = {}): CoverLetterRow {
  return { id: 'cl1', userId: 'u1', jobId: 'j1', personaId: 'p1', title: 'Acme', instructions: null, bodyMarkdown: 'Dear…', createdAt: new Date(), updatedAt: new Date(), ...over }
}
const persona = { id: 'p1', userId: 'u1', name: 'B', data: { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }, rawInput: null, createdAt: new Date(), updatedAt: new Date() }
const job = { id: 'j1', userId: 'u1', title: 'SWE', company: 'Acme', location: null, salaryRange: null, sourceUrl: null, snapshotMarkdown: null, status: 'APPLIED' as const, kanbanOrder: 1, lastActivityAt: new Date(), ghostDays: 0, notes: null, createdAt: new Date(), updatedAt: new Date() }
let app: Express
let cookie: string

beforeAll(async () => {
  process.env['NODE_ENV'] = 'test'; process.env['PORT'] = '3000'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'; process.env['DATABASE_URL'] = 'postgres://x:x@x:5432/x'
  process.env['JWT_SECRET'] = 'a'.repeat(32); process.env['JWT_ACCESS_EXPIRY'] = '15m'; process.env['JWT_REFRESH_EXPIRY'] = '7d'
  process.env['LOG_LEVEL'] = 'silent'; process.env['AI_RATE_LIMIT_PER_HOUR'] = '10'
  app = (await import('@/app.js')).createApp()
  const { signAccessToken } = await import('@/modules/auth/auth.tokens.js')
  cookie = `accessToken=${signAccessToken({ id: 'u1', email: 'a@b.c' })}`
})
beforeEach(() => { vi.clearAllMocks(); ai.isAiEnabled.mockReturnValue(true) })

describe('cover-letters routes', () => {
  it('401 without cookie', async () => { expect((await request(app).get('/api/cover-letters')).status).toBe(401) })
  it('generates (201)', async () => {
    jobs.findById.mockResolvedValue(job); personas.findById.mockResolvedValue(persona)
    ai.generateText.mockResolvedValue('Dear hiring manager')
    repo.create.mockResolvedValue(row())
    const res = await request(app).post('/api/cover-letters').set('Cookie', [cookie]).send({ jobId: UUID, personaId: UUID })
    expect(res.status).toBe(201); expect(res.body.data.id).toBe('cl1')
  })
  it('400 on missing personaId', async () => {
    const res = await request(app).post('/api/cover-letters').set('Cookie', [cookie]).send({ jobId: UUID })
    expect(res.status).toBe(400)
  })
  it('lists by job', async () => {
    repo.listForUser.mockResolvedValue([row()])
    const res = await request(app).get('/api/cover-letters?jobId=' + UUID).set('Cookie', [cookie])
    expect(res.status).toBe(200); expect(res.body.data).toHaveLength(1)
  })
  it('patches', async () => {
    repo.update.mockResolvedValue(row({ bodyMarkdown: 'Edited' }))
    const res = await request(app).patch('/api/cover-letters/cl1').set('Cookie', [cookie]).send({ bodyMarkdown: 'Edited' })
    expect(res.status).toBe(200); expect(res.body.data.bodyMarkdown).toBe('Edited')
  })
  it('404 patching missing', async () => {
    repo.update.mockResolvedValue(null)
    const res = await request(app).patch('/api/cover-letters/x').set('Cookie', [cookie]).send({ bodyMarkdown: 'E' })
    expect(res.status).toBe(404)
  })
  it('deletes (204)', async () => {
    repo.remove.mockResolvedValue(true)
    expect((await request(app).delete('/api/cover-letters/cl1').set('Cookie', [cookie])).status).toBe(204)
  })
})
