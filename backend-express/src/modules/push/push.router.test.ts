import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import type { DeviceTokenRow } from '@/db/schema/device-tokens.js'

vi.mock('./push.repository.js', () => ({
  pushRepository: {
    upsert: vi.fn(),
    listForUser: vi.fn(),
    remove: vi.fn(),
    removeTokens: vi.fn(),
  },
}))

import { pushRepository } from './push.repository.js'

const repo = vi.mocked(pushRepository)
const TOKEN = 'ExponentPushToken[abc123]'
let app: Express
let cookie: string

function fakeDevice(over: Partial<DeviceTokenRow> = {}): DeviceTokenRow {
  return {
    id: 'd1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1',
    token: TOKEN, platform: 'android', ...over,
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

describe('POST /api/push/devices', () => {
  it('401s without an access token', async () => {
    const res = await request(app).post('/api/push/devices').send({ token: TOKEN, platform: 'android' })
    expect(res.status).toBe(401)
    expect(repo.upsert).not.toHaveBeenCalled()
  })

  it('201s and registers the token against the caller', async () => {
    repo.upsert.mockResolvedValue(fakeDevice())
    const res = await request(app)
      .post('/api/push/devices')
      .set('Cookie', [cookie])
      .send({ token: TOKEN, platform: 'android' })
    expect(res.status).toBe(201)
    expect(res.body.data.token).toBe(TOKEN)
    expect(repo.upsert).toHaveBeenCalledWith({ userId: 'u1', token: TOKEN, platform: 'android' })
  })

  it('400s on a token that is not an Expo push token', async () => {
    const res = await request(app)
      .post('/api/push/devices')
      .set('Cookie', [cookie])
      .send({ token: 'raw-fcm-token', platform: 'android' })
    expect(res.status).toBe(400)
    expect(repo.upsert).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/push/devices/:token', () => {
  it('204s and deletes scoped to the caller', async () => {
    repo.remove.mockResolvedValue(true)
    const res = await request(app)
      .delete(`/api/push/devices/${encodeURIComponent(TOKEN)}`)
      .set('Cookie', [cookie])
    expect(res.status).toBe(204)
    expect(repo.remove).toHaveBeenCalledWith('u1', TOKEN)
  })

  it('404s when the caller owns no such token', async () => {
    repo.remove.mockResolvedValue(false)
    const res = await request(app)
      .delete(`/api/push/devices/${encodeURIComponent(TOKEN)}`)
      .set('Cookie', [cookie])
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('NOT_FOUND')
  })
})
