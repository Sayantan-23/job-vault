import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import type { JobRow } from '@/db/schema/jobs.js'

vi.mock('./jobs.repository.js', () => ({
  jobsRepository: {
    nextKanbanOrder: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
    move: vi.fn(),
    remove: vi.fn(),
  },
}))
vi.mock('./scraper.js', () => ({ scrapeUrl: vi.fn() }))

import { jobsRepository } from './jobs.repository.js'
import { scrapeUrl } from './scraper.js'

const repo = vi.mocked(jobsRepository)
const scrape = vi.mocked(scrapeUrl)
let app: Express
let cookie: string

function fakeJob(over: Record<string, unknown> = {}): JobRow {
  return {
    id: 'j1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', title: 'SWE', company: 'Acme',
    location: null, salaryRange: null, sourceUrl: null, snapshotMarkdown: null, status: 'WISHLIST',
    kanbanOrder: 1, lastActivityAt: new Date(), ghostDays: 0, notes: null, ...over,
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

describe('GET /api/jobs', () => {
  it('401s without an access token cookie', async () => {
    const res = await request(app).get('/api/jobs')
    expect(res.status).toBe(401)
  })

  it('200s with a list + pagination meta', async () => {
    repo.findAll.mockResolvedValue({ rows: [fakeJob()], total: 1 })
    const res = await request(app).get('/api/jobs').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.meta).toMatchObject({ total: 1, page: 1, limit: 20, totalPages: 1 })
  })

  it('400s on an out-of-range limit', async () => {
    const res = await request(app).get('/api/jobs?limit=999').set('Cookie', [cookie])
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })
})

describe('POST /api/jobs', () => {
  it('400s on a missing title', async () => {
    const res = await request(app).post('/api/jobs').set('Cookie', [cookie]).send({ company: 'Acme' })
    expect(res.status).toBe(400)
  })

  it('201s and returns the created job', async () => {
    repo.nextKanbanOrder.mockResolvedValue(1)
    repo.create.mockResolvedValue(fakeJob())
    const res = await request(app).post('/api/jobs').set('Cookie', [cookie]).send({ title: 'SWE', company: 'Acme' })
    expect(res.status).toBe(201)
    expect(res.body.data.id).toBe('j1')
  })
})

describe('POST /api/jobs/scrape', () => {
  it('200s and returns a preview ScrapeResult (does not persist)', async () => {
    scrape.mockResolvedValue({ title: 'Scraped', company: 'Co', snapshotMarkdown: '# md' })
    const res = await request(app)
      .post('/api/jobs/scrape')
      .set('Cookie', [cookie])
      .send({ sourceUrl: 'https://example.com/job' })
    expect(res.status).toBe(200)
    expect(res.body.data.title).toBe('Scraped')
    expect(repo.create).not.toHaveBeenCalled()
  })

  it('400s on an invalid URL', async () => {
    const res = await request(app).post('/api/jobs/scrape').set('Cookie', [cookie]).send({ sourceUrl: 'nope' })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/jobs/:id', () => {
  it('404s when the job is missing', async () => {
    repo.findById.mockResolvedValue(null)
    const res = await request(app).get('/api/jobs/does-not-exist').set('Cookie', [cookie])
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('NOT_FOUND')
  })
})

describe('PATCH /api/jobs/:id/move', () => {
  it('200s and returns the moved job', async () => {
    repo.move.mockResolvedValue(fakeJob({ status: 'OFFER', kanbanOrder: 3 }))
    const res = await request(app)
      .patch('/api/jobs/j1/move')
      .set('Cookie', [cookie])
      .send({ status: 'OFFER', kanbanOrder: 3 })
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('OFFER')
  })
})

describe('DELETE /api/jobs/:id', () => {
  it('200s with a message', async () => {
    repo.remove.mockResolvedValue(true)
    const res = await request(app).delete('/api/jobs/j1').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data.message).toBe('Job deleted successfully')
  })
})
