import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'

vi.mock('./dashboard.repository.js', () => ({
  dashboardRepository: { findForUser: vi.fn() },
}))

import { dashboardRepository } from './dashboard.repository.js'

const repo = vi.mocked(dashboardRepository)
let app: Express
let cookie: string

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

describe('GET /api/dashboard/kanban', () => {
  it('401s without an access token cookie', async () => {
    const res = await request(app).get('/api/dashboard/kanban')
    expect(res.status).toBe(401)
  })

  it('200s with 6 columns and stats', async () => {
    repo.findForUser.mockResolvedValue([])
    const res = await request(app).get('/api/dashboard/kanban').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data.columns).toHaveLength(6)
    expect(res.body.data.columns[0].status).toBe('WISHLIST')
    expect(res.body.data.stats).toMatchObject({ totalJobs: 0 })
  })

  it('400s on an invalid ghostFilter', async () => {
    const res = await request(app).get('/api/dashboard/kanban?ghostFilter=spooky').set('Cookie', [cookie])
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('forwards search/status to the repository', async () => {
    repo.findForUser.mockResolvedValue([])
    await request(app).get('/api/dashboard/kanban?search=acme&status=APPLIED').set('Cookie', [cookie])
    expect(repo.findForUser).toHaveBeenCalledWith('u1', { search: 'acme', status: 'APPLIED' })
  })
})

describe('GET /api/dashboard/stats', () => {
  it('401s without a cookie', async () => {
    const res = await request(app).get('/api/dashboard/stats')
    expect(res.status).toBe(401)
  })

  it('200s with global stats', async () => {
    repo.findForUser.mockResolvedValue([])
    const res = await request(app).get('/api/dashboard/stats').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ totalJobs: 0, ghostAlerts: 0, recentActivity: 0 })
    expect(res.body.data.byStatus.WISHLIST).toBe(0)
  })
})
