import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { ProfileContentSchema, type ProfileContent } from '@/shared/profile-content.schema.js'

vi.mock('./profile.repository.js', () => ({
  profileRepository: { findByUserId: vi.fn(), upsert: vi.fn() },
}))
vi.mock('@/modules/auth/auth.repository.js', () => ({
  authRepository: { findById: vi.fn() },
}))

import { profileRepository } from './profile.repository.js'
import { authRepository } from '@/modules/auth/auth.repository.js'
import type { UserRow } from '@/db/schema/users.js'

const repo = vi.mocked(profileRepository)
const auth = vi.mocked(authRepository)
let app: Express
let cookie: string
const CONTENT: ProfileContent = ProfileContentSchema.parse({ basics: { name: 'Ada' }, summary: 'hi' })

function userRow(name: string, email: string): UserRow {
  return {
    id: 'u1',
    createdAt: new Date(),
    updatedAt: new Date(),
    name,
    email,
    passwordHash: null,
    googleId: null,
    isEmailVerified: false,
    masterResumeUrl: null,
    masterProfileJson: null,
    preferences: null,
    refreshTokenHash: null,
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

describe('profile routes', () => {
  it('401s without a cookie', async () => {
    expect((await request(app).get('/api/profile')).status).toBe(401)
  })
  it('GET seeds an empty profile from the registered name/email when none saved', async () => {
    repo.findByUserId.mockResolvedValue(null)
    auth.findById.mockResolvedValue(userRow('Ada Lovelace', 'ada@example.com'))
    const res = await request(app).get('/api/profile').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data.basics.name).toBe('Ada Lovelace')
    expect(res.body.data.basics.email).toBe('ada@example.com')
  })
  it('GET returns saved content', async () => {
    repo.findByUserId.mockResolvedValue({ id: 'pr1', userId: 'u1', content: CONTENT, createdAt: new Date(), updatedAt: new Date() })
    const res = await request(app).get('/api/profile').set('Cookie', [cookie])
    expect(res.body.data.summary).toBe('hi')
  })
  it('PUT validates and upserts (200)', async () => {
    repo.upsert.mockImplementation(async (_uid, content) => ({ id: 'pr1', userId: 'u1', content, createdAt: new Date(), updatedAt: new Date() }))
    const res = await request(app).put('/api/profile').set('Cookie', [cookie]).send({ content: CONTENT })
    expect(res.status).toBe(200)
    expect(res.body.data.basics.name).toBe('Ada')
  })
  it('PUT 400s on an invalid body (missing basics.name)', async () => {
    const res = await request(app).put('/api/profile').set('Cookie', [cookie]).send({ content: { basics: {} } })
    expect(res.status).toBe(400)
  })
})
