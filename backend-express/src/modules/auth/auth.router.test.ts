import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import type { Response } from 'supertest'

vi.mock('./auth.repository.js', () => ({
  authRepository: {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateProfile: vi.fn(),
  },
}))

vi.mock('./auth.sessions.repository.js', () => ({
  sessionsRepository: {
    create: vi.fn(),
    listByUser: vi.fn().mockResolvedValue([]),
    rotate: vi.fn(),
    deleteById: vi.fn(),
    deleteAllForUser: vi.fn(),
    deleteExpired: vi.fn(),
  },
}))

import { authRepository } from './auth.repository.js'
import { sessionsRepository } from './auth.sessions.repository.js'
import { signAccessToken, signRefreshToken, hashSecret, hashToken } from './auth.tokens.js'
import { authLimiter } from './auth.router.js'

const repo = vi.mocked(authRepository)
const sessions = vi.mocked(sessionsRepository)
let app: Express

function fakeUser(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'u1', name: 'Ada', email: 'a@b.co', passwordHash: null,
    googleId: null, isEmailVerified: false, masterResumeUrl: null, masterProfileJson: null,
    preferences: null, createdAt: new Date(), updatedAt: new Date(), ...over,
  }
}

/** The live session holding `token`, as the sessions repository would return it. */
function fakeSession(token: string, over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 's1', userId: 'u1', tokenHash: hashToken(token), client: 'web' as const,
    previousTokenHash: null, rotatedAt: null,
    createdAt: new Date(), updatedAt: new Date(), lastUsedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), ...over,
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

beforeEach(() => {
  vi.clearAllMocks()
  sessions.listByUser.mockResolvedValue([])
  // Default: the presented token was current, so the row rotated to it.
  sessions.rotate.mockImplementation(async (_userId, _id, values) => ({
    ...fakeSession(''), ...values, rotatedAt: new Date(),
  }))
  sessions.create.mockImplementation(async (values) => ({ ...fakeSession(''), ...values }))
  // The whole file shares one rate-limit bucket (20 per window); reset it per
  // test rather than budgeting requests. Never raise `max` — that is the control.
  authLimiter.resetKey('::ffff:127.0.0.1')
})

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
    expect(res.body.data).not.toHaveProperty('accessToken')
    expect(res.body.data).not.toHaveProperty('refreshToken')
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
  it('200s and rotates the session for a valid refresh cookie', async () => {
    const token = signRefreshToken('u1')
    repo.findById.mockResolvedValue(fakeUser())
    sessions.listByUser.mockResolvedValue([fakeSession(token)])
    const res = await request(app).post('/api/auth/refresh').set('Cookie', [`refreshToken=${token}`])
    expect(res.status).toBe(200)
    expect(sessions.rotate).toHaveBeenCalledOnce()
    expect(cookies(res).some((c) => c.startsWith('accessToken='))).toBe(true)
    expect(cookies(res).some((c) => c.startsWith('refreshToken='))).toBe(true)
  })

  // The loser of a rotation race: a fresh access cookie, and the winner's
  // refresh token left untouched in the jar.
  it('200s with an access cookie only when the rotation grace window served it', async () => {
    const token = signRefreshToken('u1')
    const winner = fakeSession(signRefreshToken('u1'), {
      previousTokenHash: hashToken(token), rotatedAt: new Date(),
    })
    repo.findById.mockResolvedValue(fakeUser())
    sessions.listByUser.mockResolvedValue([winner])
    sessions.rotate.mockResolvedValue(winner) // row unchanged: the grace arm matched

    const res = await request(app).post('/api/auth/refresh').set('Cookie', [`refreshToken=${token}`])
    expect(res.status).toBe(200)
    expect(cookies(res).some((c) => c.startsWith('accessToken='))).toBe(true)
    expect(cookies(res).some((c) => c.startsWith('refreshToken='))).toBe(false)
  })

  it('401s on replay and revokes only the session that held the token', async () => {
    const token = signRefreshToken('u1')
    repo.findById.mockResolvedValue(fakeUser())
    // Rotated away long ago: still the session's `previous`, but past the grace window.
    sessions.listByUser.mockResolvedValue([
      fakeSession(signRefreshToken('u1'), {
        previousTokenHash: hashToken(token),
        rotatedAt: new Date(Date.now() - 60_000),
      }),
    ])
    sessions.rotate.mockResolvedValue(null) // past the window: no arm matched
    const res = await request(app).post('/api/auth/refresh').set('Cookie', [`refreshToken=${token}`])
    expect(res.status).toBe(401)
    expect(sessions.deleteById).toHaveBeenCalledWith('u1', 's1')
    expect(sessions.deleteAllForUser).not.toHaveBeenCalled()
  })

  it('401s for an access token posted as a refresh token, touching no session', async () => {
    const access = signAccessToken({ id: 'u1', email: 'a@b.co' }, 's1')
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: access })
    expect(res.status).toBe(401)
    expect(sessions.deleteById).not.toHaveBeenCalled()
    expect(sessions.deleteAllForUser).not.toHaveBeenCalled()
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
  it('200s, ends the session named by the access token, and clears cookies', async () => {
    const access = signAccessToken({ id: 'u1', email: 'a@b.co' }, 's7')
    const res = await request(app).post('/api/auth/logout').set('Cookie', [`accessToken=${access}`])
    expect(res.status).toBe(200)
    expect(res.body.data.message).toMatch(/logged out/i)
    expect(sessions.deleteById).toHaveBeenCalledWith('u1', 's7')
    expect(sessions.deleteAllForUser).not.toHaveBeenCalled()
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
    const token = signAccessToken({ id: 'u1', email: 'a@b.co' }, 's1')
    const res = await request(app).get('/api/auth/me').set('Cookie', [`accessToken=${token}`])
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe('u1')
  })
})

describe('PATCH /api/auth/profile', () => {
  it('200s and returns the updated user', async () => {
    repo.findById.mockResolvedValue(fakeUser())
    repo.updateProfile.mockResolvedValue(fakeUser({ name: 'New Name' }))
    const token = signAccessToken({ id: 'u1', email: 'a@b.co' }, 's1')
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
    const token = signAccessToken({ id: 'u1', email: 'a@b.co' }, 's1')
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Cookie', [`accessToken=${token}`])
      .send({ name: 'x'.repeat(101) })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })
})

// Native clients (React Native — no cookie jar) opt in with `client: 'native'`
// and get the token pair in the body instead of cookies. See d-0cc1x6.
describe('native token transport', () => {
  it('register returns the token pair in the body and sets no cookies', async () => {
    repo.findByEmail.mockResolvedValue(null)
    repo.create.mockResolvedValue(fakeUser({ passwordHash: 'h' }))
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada', email: 'a@b.co', password: 'longenough', client: 'native' })
    expect(res.status).toBe(201)
    expect(res.body.data.user.email).toBe('a@b.co')
    expect(res.body.data.user).not.toHaveProperty('passwordHash')
    expect(typeof res.body.data.accessToken).toBe('string')
    expect(typeof res.body.data.refreshToken).toBe('string')
    expect(cookies(res)).toHaveLength(0)
  })

  it('login returns the token pair in the body and sets no cookies', async () => {
    repo.findByEmail.mockResolvedValue(fakeUser({ passwordHash: await hashSecret('correct-horse') }))
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.co', password: 'correct-horse', client: 'native' })
    expect(res.status).toBe(200)
    expect(res.body.data.user.id).toBe('u1')
    expect(typeof res.body.data.accessToken).toBe('string')
    expect(typeof res.body.data.refreshToken).toBe('string')
    expect(cookies(res)).toHaveLength(0)
  })

  it('rejects an unknown client value', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.co', password: 'x', client: 'web' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('refresh rotates from a body token and returns the new pair in the body', async () => {
    const token = signRefreshToken('u1')
    repo.findById.mockResolvedValue(fakeUser())
    sessions.listByUser.mockResolvedValue([fakeSession(token, { client: 'native' })])
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: token })
    expect(res.status).toBe(200)
    expect(sessions.rotate).toHaveBeenCalledOnce()
    expect(res.body.data.user.id).toBe('u1')
    expect(typeof res.body.data.accessToken).toBe('string')
    expect(typeof res.body.data.refreshToken).toBe('string')
    expect(cookies(res)).toHaveLength(0)
  })

  it('applies reuse detection to body refresh too', async () => {
    const token = signRefreshToken('u1')
    repo.findById.mockResolvedValue(fakeUser())
    sessions.listByUser.mockResolvedValue([
      fakeSession(signRefreshToken('u1'), {
        previousTokenHash: hashToken(token),
        rotatedAt: new Date(Date.now() - 60_000),
      }),
    ])
    sessions.rotate.mockResolvedValue(null)
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: token })
    expect(res.status).toBe(401)
    expect(sessions.deleteById).toHaveBeenCalledWith('u1', 's1')
  })

  // The security core of d-0cc1x6: a header must NOT be able to select native
  // mode, or an XSS on the web could read the HttpOnly refresh token back out.
  it('never leaks the pair to a cookie refresh, even with a native-looking header', async () => {
    const token = signRefreshToken('u1')
    repo.findById.mockResolvedValue(fakeUser())
    sessions.listByUser.mockResolvedValue([fakeSession(token)])
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${token}`])
      .set('X-Client', 'native')
    expect(res.status).toBe(200)
    expect(res.body.data).not.toHaveProperty('accessToken')
    expect(res.body.data).not.toHaveProperty('refreshToken')
    expect(cookies(res).some((c) => c.startsWith('accessToken='))).toBe(true)
  })

  it('401s when the body refresh token is not a string', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 42 })
    expect(res.status).toBe(401)
  })

  it('authenticates a protected route with Authorization: Bearer', async () => {
    repo.findById.mockResolvedValue(fakeUser())
    const token = signAccessToken({ id: 'u1', email: 'a@b.co' }, 's1')
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe('u1')
  })

  // A refresh token is a 7-day credential; only its `typ` claim stops it being
  // an account-wide Bearer token (t-0cd55z).
  it('refuses a refresh token as a Bearer credential', async () => {
    repo.findById.mockResolvedValue(fakeUser())
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${signRefreshToken('u1')}`)
    expect(res.status).toBe(401)
  })
})
