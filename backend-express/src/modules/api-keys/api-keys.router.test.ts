import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import type { ApiKeyRow, NewApiKeyRow } from '@/db/schema/api-keys.js'

vi.mock('@/modules/api-keys/api-keys.repository.js', () => ({
  apiKeysRepository: {
    create: vi.fn(),
    listActiveForUser: vi.fn(),
    findActiveByPrefix: vi.fn(),
    revoke: vi.fn(),
    touchLastUsed: vi.fn(),
  },
}))

import { apiKeysRepository } from '@/modules/api-keys/api-keys.repository.js'

const repo = vi.mocked(apiKeysRepository)
const asType = <T>(value: unknown): T => value as T
function row(over: Partial<ApiKeyRow> = {}): ApiKeyRow {
  return asType<ApiKeyRow>({
    id: 'k1',
    userId: 'u1',
    name: 'Chrome',
    keyPrefix: 'jv_00000000',
    keyHash: 'h',
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  })
}

let app: Express
let cookie = ''
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

describe('api-keys routes', () => {
  it('401 without a cookie', async () => {
    expect((await request(app).get('/api/api-keys')).status).toBe(401)
  })

  it('mints a key and returns rawKey once (201), never the hash', async () => {
    repo.create.mockImplementation((v: NewApiKeyRow) =>
      Promise.resolve(row({ keyPrefix: v.keyPrefix, keyHash: v.keyHash })),
    )
    const res = await request(app).post('/api/api-keys').set('Cookie', [cookie]).send({ name: 'Chrome' })
    expect(res.status).toBe(201)
    expect(res.body.data.rawKey).toMatch(/^jv_[0-9a-f]{48}$/)
    expect(res.body.data.keyHash).toBeUndefined()
  })

  it('400 on an empty name', async () => {
    const res = await request(app).post('/api/api-keys').set('Cookie', [cookie]).send({ name: '' })
    expect(res.status).toBe(400)
  })

  it('lists active keys in the public, secret-free shape (200)', async () => {
    repo.listActiveForUser.mockResolvedValue([row()])
    const res = await request(app).get('/api/api-keys').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data[0].keyPrefix).toBe('jv_00000000')
    expect(res.body.data[0].keyHash).toBeUndefined()
  })

  it('revokes a key (204)', async () => {
    repo.revoke.mockResolvedValue(true)
    expect((await request(app).delete('/api/api-keys/k1').set('Cookie', [cookie])).status).toBe(204)
  })

  it('404 revoking a missing key', async () => {
    repo.revoke.mockResolvedValue(false)
    expect((await request(app).delete('/api/api-keys/missing').set('Cookie', [cookie])).status).toBe(404)
  })
})
