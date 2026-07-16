import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import type { JobContactRow } from '@/db/schema/job-contacts.js'
import type { JobRow } from '@/db/schema/jobs.js'

vi.mock('./contacts.repository.js', () => ({
  contactsRepository: {
    create: vi.fn(),
    listForJob: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    countsForJobs: vi.fn(),
  },
}))
vi.mock('@/modules/jobs/jobs.repository.js', () => ({
  jobsRepository: {
    findById: vi.fn(),
    nextKanbanOrder: vi.fn(),
    create: vi.fn(),
    findBySourceUrl: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
    move: vi.fn(),
    remove: vi.fn(),
  },
}))
vi.mock('@/modules/timeline/timeline.service.js', () => ({
  timelineService: { addAutoEntry: vi.fn() },
}))

import { contactsRepository } from './contacts.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'

const repo = vi.mocked(contactsRepository)
const jobs = vi.mocked(jobsRepository)
let app: Express
let cookie: string

function fakeContact(over: Record<string, unknown> = {}): JobContactRow {
  return {
    id: 'c1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', jobId: 'j1',
    contact: 'Priya', channel: null, status: 'NO_RESPONSE',
    reachedOutAt: new Date('2026-07-01T00:00:00Z'), notes: null, ...over,
  }
}
function fakeJob(): JobRow {
  return {
    id: 'j1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', title: 'T', company: 'C',
    location: null, salaryRange: null, sourceUrl: null, snapshotMarkdown: null, status: 'APPLIED',
    kanbanOrder: 1, lastActivityAt: new Date(), ghostDays: 0, notes: null,
  }
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
  app = (await import('@/app.js')).createApp()
  const { signAccessToken } = await import('@/modules/auth/auth.tokens.js')
  cookie = `accessToken=${signAccessToken({ id: 'u1', email: 'a@b.c' })}`
})

beforeEach(() => vi.clearAllMocks())

describe('GET /api/jobs/:jobId/contacts', () => {
  it('401s without a cookie', async () => {
    const res = await request(app).get('/api/jobs/j1/contacts')
    expect(res.status).toBe(401)
  })
  it('200s with the contacts list when the job is owned', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    repo.listForJob.mockResolvedValue([fakeContact()])
    const res = await request(app).get('/api/jobs/j1/contacts').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
  })
  it('404s when the job is not owned', async () => {
    jobs.findById.mockResolvedValue(null)
    const res = await request(app).get('/api/jobs/jX/contacts').set('Cookie', [cookie])
    expect(res.status).toBe(404)
  })
})

describe('POST /api/jobs/:jobId/contacts', () => {
  it('201s and returns the created contact', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    repo.create.mockResolvedValue(fakeContact())
    const res = await request(app)
      .post('/api/jobs/j1/contacts')
      .set('Cookie', [cookie])
      .send({ contact: 'Priya', channel: 'EMAIL' })
    expect(res.status).toBe(201)
    expect(res.body.data.id).toBe('c1')
  })
  it('400s on an empty contact', async () => {
    const res = await request(app)
      .post('/api/jobs/j1/contacts')
      .set('Cookie', [cookie])
      .send({ contact: '  ' })
    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/contacts/:id', () => {
  it('200s and returns the updated contact', async () => {
    repo.findById.mockResolvedValue(fakeContact())
    repo.update.mockResolvedValue(fakeContact({ status: 'HEARD_BACK' }))
    const res = await request(app).patch('/api/contacts/c1').set('Cookie', [cookie]).send({ status: 'HEARD_BACK' })
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('HEARD_BACK')
  })
  it('400s on an empty patch', async () => {
    const res = await request(app).patch('/api/contacts/c1').set('Cookie', [cookie]).send({})
    expect(res.status).toBe(400)
  })
  it('404s when missing', async () => {
    repo.findById.mockResolvedValue(null)
    const res = await request(app).patch('/api/contacts/cX').set('Cookie', [cookie]).send({ notes: 'x' })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/contacts/:id', () => {
  it('200s with the deleted id', async () => {
    repo.remove.mockResolvedValue(true)
    const res = await request(app).delete('/api/contacts/c1').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ id: 'c1' })
  })
})
