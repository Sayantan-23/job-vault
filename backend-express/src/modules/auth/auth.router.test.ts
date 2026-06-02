import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import type { Response } from 'supertest'

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
import { signAccessToken, signRefreshToken, hashSecret } from './auth.tokens.js'

const repo = vi.mocked(authRepository)
let app: Express

function fakeUser(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'u1', name: 'Ada', email: 'a@b.co', passwordHash: null, refreshTokenHash: null,
    googleId: null, isEmailVerified: false, masterResumeUrl: null, masterProfileJson: null,
    preferences: null, createdAt: new Date(), updatedAt: new Date(), ...over,
  }
}

// Supertest types set-cookie as unknown; at runtime it is a string[].
function cookies(res: Response): string[] {
  return (res.headers['set-cookie'] ?? []) as unknown as string[]
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

  it('201s, sets both cookies with the right flags, returns the public user (no secrets)', async () => {
    repo.findByEmail.mockResolvedValue(null)
    repo.create.mockResolvedValue(fakeUser({ passwordHash: 'h' }))
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada', email: 'a@b.co', password: 'longenough' })
    expect(res.status).toBe(201)
    expect(res.body.data.email).toBe('a@b.co')
    expect(res.body.data).not.toHaveProperty('passwordHash')
    expect(res.body.data).not.toHaveProperty('refreshTokenHash')
    const access = cookies(res).find((c) => c.startsWith('accessToken='))
    const refresh = cookies(res).find((c) => c.startsWith('refreshToken='))
    expect(access).toMatch(/HttpOnly/i)
    expect(access).toMatch(/Path=\//)
    expect(access).toMatch(/SameSite=Lax/i)
    expect(refresh).toMatch(/HttpOnly/i)
    // Refresh cookie is site-wide (Path=/) so middleware + silent refresh can use it.
    expect(refresh).toMatch(/Path=\/(?:;|$)/)
    expect(refresh).not.toMatch(/Path=\/api\/auth/)
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

  it('200s with correct credentials and sets cookies', async () => {
    repo.findByEmail.mockResolvedValue(fakeUser({ passwordHash: await hashSecret('correct-horse') }))
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.co', password: 'correct-horse' })
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe('u1')
    expect(cookies(res).some((c) => c.startsWith('accessToken='))).toBe(true)
    expect(cookies(res).some((c) => c.startsWith('refreshToken='))).toBe(true)
  })

  it('401s for a google-only account (no password hash)', async () => {
    repo.findByEmail.mockResolvedValue(fakeUser({ passwordHash: null }))
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'x' })
    expect(res.status).toBe(401)
  })

  it('401s on a wrong password', async () => {
    repo.findByEmail.mockResolvedValue(fakeUser({ passwordHash: await hashSecret('right') }))
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'wrong' })
    expect(res.status).toBe(401)
  })
})

describe('POST /api/auth/refresh', () => {
  it('200s and rotates tokens for a valid refresh cookie', async () => {
    const token = signRefreshToken('u1')
    repo.findById.mockResolvedValue(fakeUser({ refreshTokenHash: await hashSecret(token) }))
    const res = await request(app).post('/api/auth/refresh').set('Cookie', [`refreshToken=${token}`])
    expect(res.status).toBe(200)
    expect(repo.setRefreshTokenHash).toHaveBeenCalledOnce()
    expect(cookies(res).some((c) => c.startsWith('accessToken='))).toBe(true)
  })

  it('401s and clears the stored hash on reuse (token != stored hash)', async () => {
    const token = signRefreshToken('u1')
    repo.findById.mockResolvedValue(fakeUser({ refreshTokenHash: await hashSecret('a-different-token') }))
    const res = await request(app).post('/api/auth/refresh').set('Cookie', [`refreshToken=${token}`])
    expect(res.status).toBe(401)
    expect(repo.clearRefreshTokenHash).toHaveBeenCalledWith('u1')
  })

  it('401s for a malformed refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh').set('Cookie', ['refreshToken=garbage'])
    expect(res.status).toBe(401)
  })

  it('401s when no refresh cookie is present', async () => {
    const res = await request(app).post('/api/auth/refresh')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/auth/logout', () => {
  it('200s, revokes the refresh hash, and clears cookies', async () => {
    const token = signAccessToken({ id: 'u1', email: 'a@b.co' })
    const res = await request(app).post('/api/auth/logout').set('Cookie', [`accessToken=${token}`])
    expect(res.status).toBe(200)
    expect(res.body.data.message).toMatch(/logged out/i)
    expect(repo.clearRefreshTokenHash).toHaveBeenCalledWith('u1')
    expect(cookies(res).some((c) => c.startsWith('accessToken='))).toBe(true)
  })

  it('401s without an access token cookie', async () => {
    const res = await request(app).post('/api/auth/logout')
    expect(res.status).toBe(401)
  })
})

describe('GET /api/auth/me', () => {
  it('401s without an access token cookie', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('200s with a valid access token cookie', async () => {
    repo.findById.mockResolvedValue(fakeUser())
    const token = signAccessToken({ id: 'u1', email: 'a@b.co' })
    const res = await request(app).get('/api/auth/me').set('Cookie', [`accessToken=${token}`])
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe('u1')
  })
})

describe('PATCH /api/auth/profile', () => {
  it('200s and returns the updated user', async () => {
    repo.findById.mockResolvedValue(fakeUser())
    repo.updateProfile.mockResolvedValue(fakeUser({ name: 'New Name' }))
    const token = signAccessToken({ id: 'u1', email: 'a@b.co' })
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Cookie', [`accessToken=${token}`])
      .send({ name: 'New Name' })
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('New Name')
  })

  it('401s without an access token cookie', async () => {
    const res = await request(app).patch('/api/auth/profile').send({ name: 'x' })
    expect(res.status).toBe(401)
  })

  it('400s on an invalid body (name too long)', async () => {
    const token = signAccessToken({ id: 'u1', email: 'a@b.co' })
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Cookie', [`accessToken=${token}`])
      .send({ name: 'x'.repeat(101) })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })
})
