import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'

vi.mock('./auth.repository.js', () => ({
  authRepository: {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    setRefreshTokenHash: vi.fn(),
    clearRefreshTokenHash: vi.fn(),
    updateProfile: vi.fn(),
  },
}))

import { authRepository } from './auth.repository.js'

const repo = vi.mocked(authRepository)
let app: Express

function fakeUser(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'u1', name: 'Ada', email: 'a@b.co', passwordHash: null, refreshTokenHash: null,
    googleId: null, isEmailVerified: false, masterResumeUrl: null, masterProfileJson: null,
    preferences: null, createdAt: new Date(), updatedAt: new Date(), ...over,
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
})

beforeEach(() => vi.clearAllMocks())

describe('POST /api/auth/register', () => {
  it('400s on invalid body', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'no' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('201s, sets both cookies, returns the public user (no secrets)', async () => {
    repo.findByEmail.mockResolvedValue(null)
    repo.create.mockResolvedValue(fakeUser({ passwordHash: 'h' }))
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada', email: 'a@b.co', password: 'longenough' })
    expect(res.status).toBe(201)
    expect(res.body.data.email).toBe('a@b.co')
    expect(res.body.data).not.toHaveProperty('passwordHash')
    const cookies = res.headers['set-cookie'] as unknown as string[]
    expect(cookies.some((c) => c.startsWith('accessToken='))).toBe(true)
    expect(cookies.some((c) => c.startsWith('refreshToken=') && c.includes('Path=/api/auth'))).toBe(true)
  })

  it('409s on duplicate email', async () => {
    repo.findByEmail.mockResolvedValue(fakeUser())
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada', email: 'a@b.co', password: 'longenough' })
    expect(res.status).toBe(409)
    expect(res.body.error).toBe('CONFLICT')
  })
})

describe('POST /api/auth/login', () => {
  it('401s on unknown user', async () => {
    repo.findByEmail.mockResolvedValue(null)
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'x' })
    expect(res.status).toBe(401)
  })
})

describe('GET /api/auth/me', () => {
  it('401s without an access token cookie', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('200s with a valid access token cookie', async () => {
    const { signAccessToken } = await import('./auth.tokens.js')
    repo.findById.mockResolvedValue(fakeUser())
    const token = signAccessToken({ id: 'u1', email: 'a@b.co' })
    const res = await request(app).get('/api/auth/me').set('Cookie', [`accessToken=${token}`])
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe('u1')
  })
})
