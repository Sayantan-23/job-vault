import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import type { GeneratedResumeRow } from '@/db/schema/generated-resumes.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'
import type { ProfileContent } from '@/shared/profile-content.schema.js'

vi.mock('./resumes.repository.js', () => ({
  resumesRepository: { create: vi.fn(), listForUser: vi.fn(), findById: vi.fn(), update: vi.fn(), remove: vi.fn() },
}))
vi.mock('@/modules/personas/personas.repository.js', () => ({ personasRepository: { findById: vi.fn() } }))
vi.mock('@/modules/jobs/jobs.repository.js', () => ({ jobsRepository: { findById: vi.fn() } }))
vi.mock('@/modules/ai/gemini.service.js', () => ({ geminiService: { isAiEnabled: vi.fn(() => true), generateStructured: vi.fn() } }))
vi.mock('@/modules/ai/ai-usage.repository.js', () => ({ aiUsageRepository: { countRecentGenerations: vi.fn().mockResolvedValue(0) } }))
vi.mock('@/modules/profile/profile.repository.js', () => ({ profileRepository: { findByUserId: vi.fn().mockResolvedValue(null), upsert: vi.fn() } }))

import { resumesRepository } from './resumes.repository.js'
import { personasRepository } from '@/modules/personas/personas.repository.js'
import { geminiService } from '@/modules/ai/gemini.service.js'

const repo = vi.mocked(resumesRepository)
const personas = vi.mocked(personasRepository)
const ai = vi.mocked(geminiService)
const C: ResumeContent = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }
const P: ProfileContent = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }
function row(over: Partial<GeneratedResumeRow> = {}): GeneratedResumeRow {
  return { id: 'res1', userId: 'u1', personaId: 'p1', jobId: null, title: 'Backend', instructions: null, content: C, createdAt: new Date(), updatedAt: new Date(), ...over }
}
const persona = { id: 'p1', userId: 'u1', name: 'Backend', data: P, rawInput: null, createdAt: new Date(), updatedAt: new Date() }
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

describe('resumes routes', () => {
  it('401 without cookie', async () => { expect((await request(app).get('/api/resumes')).status).toBe(401) })
  it('generates (201)', async () => {
    personas.findById.mockResolvedValue(persona)
    ai.generateStructured.mockResolvedValue(C)
    repo.create.mockResolvedValue(row())
    const res = await request(app).post('/api/resumes').set('Cookie', [cookie]).send({ personaId: '11111111-1111-1111-1111-111111111111' })
    expect(res.status).toBe(201)
    expect(res.body.data.id).toBe('res1')
  })
  it('400 on a missing personaId', async () => {
    const res = await request(app).post('/api/resumes').set('Cookie', [cookie]).send({})
    expect(res.status).toBe(400)
  })
  it('lists', async () => {
    repo.listForUser.mockResolvedValue([row()])
    const res = await request(app).get('/api/resumes').set('Cookie', [cookie])
    expect(res.status).toBe(200); expect(res.body.data).toHaveLength(1)
  })
  it('gets the .tex', async () => {
    repo.findById.mockResolvedValue(row())
    const res = await request(app).get('/api/resumes/res1/tex').set('Cookie', [cookie])
    expect(res.status).toBe(200); expect(res.body.data.tex).toContain('\\documentclass')
  })
  it('patches', async () => {
    repo.update.mockResolvedValue(row({ title: 'X' }))
    const res = await request(app).patch('/api/resumes/res1').set('Cookie', [cookie]).send({ title: 'X' })
    expect(res.status).toBe(200); expect(res.body.data.title).toBe('X')
  })
  it('404 patching missing', async () => {
    repo.update.mockResolvedValue(null)
    const res = await request(app).patch('/api/resumes/x').set('Cookie', [cookie]).send({ title: 'X' })
    expect(res.status).toBe(404)
  })
  it('deletes (204)', async () => {
    repo.remove.mockResolvedValue(true)
    expect((await request(app).delete('/api/resumes/res1').set('Cookie', [cookie])).status).toBe(204)
  })
})
