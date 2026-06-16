import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import type { TimelineEventRow } from '@/db/schema/timeline.js'
import type { JobRow } from '@/db/schema/jobs.js'

vi.mock('./timeline.repository.js', () => ({
  timelineRepository: {
    findByJob: vi.fn(),
    findByUser: vi.fn(),
    create: vi.fn(),
  },
}))
vi.mock('@/modules/jobs/jobs.repository.js', () => ({
  jobsRepository: {
    findById: vi.fn(),
    update: vi.fn(),
  },
}))

import { timelineRepository } from './timeline.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'

const timeline = vi.mocked(timelineRepository)
const jobs = vi.mocked(jobsRepository)
let app: Express
let cookie: string

function fakeJob(over: Record<string, unknown> = {}): JobRow {
  return {
    id: 'j1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', title: 'SWE', company: 'Acme',
    location: null, salaryRange: null, sourceUrl: null, snapshotMarkdown: null, status: 'WISHLIST',
    kanbanOrder: 1, lastActivityAt: new Date(), ghostDays: 0, notes: null, ...over,
  }
}

function fakeEvent(over: Record<string, unknown> = {}): TimelineEventRow {
  return {
    id: 't1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', jobId: 'j1',
    type: 'MANUAL', title: 'note', description: null, ...over,
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

describe('GET /api/jobs/:jobId/timeline', () => {
  it('401s without an access token cookie', async () => {
    const res = await request(app).get('/api/jobs/j1/timeline')
    expect(res.status).toBe(401)
  })

  it('200s with the event list when the job is owned', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    timeline.findByJob.mockResolvedValue([fakeEvent()])
    const res = await request(app).get('/api/jobs/j1/timeline').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(jobs.findById).toHaveBeenCalledWith('u1', 'j1')
  })

  it('404s when the job is missing or not owned', async () => {
    jobs.findById.mockResolvedValue(null)
    const res = await request(app).get('/api/jobs/missing/timeline').set('Cookie', [cookie])
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('NOT_FOUND')
  })
})

describe('GET /api/timeline (global feed)', () => {
  it('401s without an access token cookie', async () => {
    const res = await request(app).get('/api/timeline')
    expect(res.status).toBe(401)
    expect(timeline.findByUser).not.toHaveBeenCalled()
  })

  it('200s with the enriched rows and pagination meta', async () => {
    timeline.findByUser.mockResolvedValue({
      rows: [{ ...fakeEvent({ title: 'Status changed to Applied' }), jobTitle: 'SWE', jobCompany: 'Acme' }],
      total: 1,
    })
    const res = await request(app).get('/api/timeline').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].jobCompany).toBe('Acme')
    expect(res.body.meta).toMatchObject({ total: 1, page: 1, limit: 50, totalPages: 1 })
  })

  it('forwards page/limit query params (offset = (page-1)*limit)', async () => {
    timeline.findByUser.mockResolvedValue({ rows: [], total: 5 })
    const res = await request(app).get('/api/timeline?page=2&limit=2').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(timeline.findByUser).toHaveBeenCalledWith('u1', 2, 2)
    expect(res.body.meta).toMatchObject({ total: 5, page: 2, limit: 2, totalPages: 3 })
  })

  it('400s on an invalid page param', async () => {
    const res = await request(app).get('/api/timeline?page=0').set('Cookie', [cookie])
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })
})

describe('POST /api/jobs/:jobId/timeline', () => {
  it('400s on a missing title', async () => {
    const res = await request(app).post('/api/jobs/j1/timeline').set('Cookie', [cookie]).send({ description: 'x' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('201s, creates a MANUAL event, and bumps the job', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    timeline.create.mockResolvedValue(fakeEvent({ title: 'Called recruiter' }))
    jobs.update.mockResolvedValue(fakeJob())
    const res = await request(app)
      .post('/api/jobs/j1/timeline')
      .set('Cookie', [cookie])
      .send({ title: 'Called recruiter', description: 'vm' })
    expect(res.status).toBe(201)
    expect(res.body.data.title).toBe('Called recruiter')
    expect(jobs.update).toHaveBeenCalledWith('u1', 'j1', {})
  })

  it('404s when posting to a job that is not owned', async () => {
    jobs.findById.mockResolvedValue(null)
    const res = await request(app)
      .post('/api/jobs/missing/timeline')
      .set('Cookie', [cookie])
      .send({ title: 'x' })
    expect(res.status).toBe(404)
  })
})
