import { describe, it, expect, vi, beforeEach } from 'vitest'

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
import { authService } from './auth.service.js'
import * as tokens from './auth.tokens.js'

const repo = vi.mocked(authRepository)

function fakeUser(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'u1',
    name: 'Ada',
    email: 'a@b.c',
    passwordHash: null,
    refreshTokenHash: null,
    googleId: null,
    isEmailVerified: false,
    masterResumeUrl: null,
    masterProfileJson: null,
    preferences: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['DATABASE_URL'] = 'postgres://x:x@x:5432/x'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  process.env['JWT_ACCESS_EXPIRY'] = '15m'
  process.env['JWT_REFRESH_EXPIRY'] = '7d'
})

describe('authService.register', () => {
  it('rejects a duplicate email with CONFLICT', async () => {
    repo.findByEmail.mockResolvedValue(fakeUser())
    await expect(
      authService.register({ name: 'Ada', email: 'a@b.c', password: 'longenough' }),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  it('hashes the password, stores a refresh hash, and returns tokens + user', async () => {
    repo.findByEmail.mockResolvedValue(null)
    repo.create.mockResolvedValue(fakeUser({ passwordHash: 'hashed' }))
    const result = await authService.register({ name: 'Ada', email: 'a@b.c', password: 'longenough' })
    expect(repo.create).toHaveBeenCalledOnce()
    const created = repo.create.mock.calls[0]?.[0] as { passwordHash: string }
    expect(created.passwordHash).not.toBe('longenough')
    expect(repo.setRefreshTokenHash).toHaveBeenCalledOnce()
    expect(result.accessToken).toBeTruthy()
    expect(result.refreshToken).toBeTruthy()
    expect(result.user.email).toBe('a@b.c')
  })
})

describe('authService.login', () => {
  it('throws UNAUTHORIZED when the user does not exist', async () => {
    repo.findByEmail.mockResolvedValue(null)
    await expect(authService.login({ email: 'a@b.c', password: 'x' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
  })

  it('throws UNAUTHORIZED for a google-only account (no password hash)', async () => {
    repo.findByEmail.mockResolvedValue(fakeUser({ passwordHash: null }))
    await expect(authService.login({ email: 'a@b.c', password: 'x' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
  })

  it('logs in with the correct password', async () => {
    const passwordHash = await tokens.hashSecret('correct-horse')
    repo.findByEmail.mockResolvedValue(fakeUser({ passwordHash }))
    const result = await authService.login({ email: 'a@b.c', password: 'correct-horse' })
    expect(result.user.id).toBe('u1')
    expect(repo.setRefreshTokenHash).toHaveBeenCalledOnce()
  })

  it('rejects a wrong password', async () => {
    const passwordHash = await tokens.hashSecret('correct-horse')
    repo.findByEmail.mockResolvedValue(fakeUser({ passwordHash }))
    await expect(authService.login({ email: 'a@b.c', password: 'wrong' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
  })
})

describe('authService.refresh', () => {
  it('rotates tokens for a valid refresh token', async () => {
    const refreshToken = tokens.signRefreshToken('u1')
    const refreshTokenHash = await tokens.hashSecret(refreshToken)
    repo.findById.mockResolvedValue(fakeUser({ refreshTokenHash }))
    const result = await authService.refresh(refreshToken)
    expect(result.user.id).toBe('u1')
    expect(repo.setRefreshTokenHash).toHaveBeenCalledOnce()
  })

  it('detects reuse: clears the hash and throws when the token does not match the stored hash', async () => {
    const refreshToken = tokens.signRefreshToken('u1')
    // Sign for a different subject so the stored hash is guaranteed to differ
    // from `refreshToken` (two same-second tokens for the same sub are byte-identical).
    const otherHash = await tokens.hashSecret(tokens.signRefreshToken('u2'))
    repo.findById.mockResolvedValue(fakeUser({ refreshTokenHash: otherHash }))
    await expect(authService.refresh(refreshToken)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    expect(repo.clearRefreshTokenHash).toHaveBeenCalledWith('u1')
  })

  it('throws UNAUTHORIZED for a malformed refresh token', async () => {
    await expect(authService.refresh('garbage')).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
})
