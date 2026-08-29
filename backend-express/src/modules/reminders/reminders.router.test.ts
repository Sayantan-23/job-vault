import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import type { ReminderRow } from '@/db/schema/reminders.js'
import type { JobRow } from '@/db/schema/jobs.js'

vi.mock('./reminders.repository.js', () => ({
  remindersRepository: {
    create: vi.fn(),
    listForJob: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    findDue: vi.fn(),
    markCompleted: vi.fn(),
  },
}))
vi.mock('@/modules/jobs/jobs.repository.js', () => ({
  jobsRepository: {
    findById: vi.fn(),
    nextKanbanOrder: vi.fn(),
    create: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
    move: vi.fn(),
    remove: vi.fn(),
  },
}))

import { remindersRepository } from './reminders.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'

const repo = vi.mocked(remindersRepository)
const jobs = vi.mocked(jobsRepository)
let app: Express
let cookie: string

function fakeReminder(over: Record<string, unknown> = {}): ReminderRow {
  return {
    id: 'r1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', jobId: 'j1',
    message: 'Ping', remindAt: new Date('2026-07-01T00:00:00Z'), isCompleted: false, ...over,
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
  cookie = `accessToken=${signAccessToken({ id: 'u1', email: 'a@b.c' }, 's1')}`
})

beforeEach(() => vi.clearAllMocks())

describe('GET /api/jobs/:jobId/reminders', () => {
  it('401s without a cookie', async () => {
    const res = await request(app).get('/api/jobs/j1/reminders')
    expect(res.status).toBe(401)
  })
  it('200s with the reminders list when the job is owned', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    repo.listForJob.mockResolvedValue([fakeReminder()])
    const res = await request(app).get('/api/jobs/j1/reminders').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
  })
  it('404s when the job is not owned', async () => {
    jobs.findById.mockResolvedValue(null)
    const res = await request(app).get('/api/jobs/jX/reminders').set('Cookie', [cookie])
    expect(res.status).toBe(404)
  })
})

describe('POST /api/jobs/:jobId/reminders', () => {
  it('201s and returns the created reminder', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    repo.create.mockResolvedValue(fakeReminder())
    const res = await request(app)
      .post('/api/jobs/j1/reminders')
      .set('Cookie', [cookie])
      .send({ message: 'Ping', remindAt: '2026-07-01T00:00:00Z' })
    expect(res.status).toBe(201)
    expect(res.body.data.id).toBe('r1')
  })
  it('400s on an empty message', async () => {
    const res = await request(app)
      .post('/api/jobs/j1/reminders')
      .set('Cookie', [cookie])
      .send({ message: '', remindAt: '2026-07-01T00:00:00Z' })
    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/reminders/:id', () => {
  it('200s and returns the updated reminder', async () => {
    repo.update.mockResolvedValue(fakeReminder({ isCompleted: true }))
    const res = await request(app).patch('/api/reminders/r1').set('Cookie', [cookie]).send({ isCompleted: true })
    expect(res.status).toBe(200)
    expect(res.body.data.isCompleted).toBe(true)
  })
  it('404s when missing', async () => {
    repo.update.mockResolvedValue(null)
    const res = await request(app).patch('/api/reminders/rX').set('Cookie', [cookie]).send({ message: 'x' })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/reminders/:id', () => {
  it('200s with the deleted id', async () => {
    repo.remove.mockResolvedValue(true)
    const res = await request(app).delete('/api/reminders/r1').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ id: 'r1' })
  })
})
