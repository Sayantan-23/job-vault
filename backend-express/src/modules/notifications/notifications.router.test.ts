import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import type { NotificationRow } from '@/db/schema/notifications.js'

vi.mock('./notifications.repository.js', () => ({
  notificationsRepository: {
    create: vi.fn(),
    list: vi.fn(),
    findById: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}))

import { notificationsRepository } from './notifications.repository.js'

const repo = vi.mocked(notificationsRepository)
let app: Express
let cookie: string

function fakeNotification(over: Record<string, unknown> = {}): NotificationRow {
  return {
    id: 'n1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', message: 'hi',
    type: 'REMINDER', isRead: false, relatedJobId: null, ...over,
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

describe('GET /api/notifications', () => {
  it('401s without an access token cookie', async () => {
    const res = await request(app).get('/api/notifications')
    expect(res.status).toBe(401)
  })

  it('200s with the list (unreadOnly=false by default)', async () => {
    repo.list.mockResolvedValue([fakeNotification()])
    const res = await request(app).get('/api/notifications').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(repo.list).toHaveBeenCalledWith('u1', false)
  })

  it('passes unreadOnly=true through', async () => {
    repo.list.mockResolvedValue([])
    await request(app).get('/api/notifications?unreadOnly=true').set('Cookie', [cookie])
    expect(repo.list).toHaveBeenCalledWith('u1', true)
  })
})

describe('PATCH /api/notifications/read-all', () => {
  it('routes to read-all (NOT captured as :id) and returns the count', async () => {
    repo.markAllRead.mockResolvedValue(2)
    const res = await request(app).patch('/api/notifications/read-all').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ updated: 2 })
    expect(repo.markRead).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/notifications/:id/read', () => {
  it('200s and returns the updated notification', async () => {
    repo.markRead.mockResolvedValue(fakeNotification({ isRead: true }))
    const res = await request(app).patch('/api/notifications/n1/read').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data.isRead).toBe(true)
  })

  it('404s when the notification is missing', async () => {
    repo.markRead.mockResolvedValue(null)
    const res = await request(app).patch('/api/notifications/missing/read').set('Cookie', [cookie])
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('NOT_FOUND')
  })
})
