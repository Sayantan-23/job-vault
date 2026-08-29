import { describe, it, expect, vi, beforeEach } from 'vitest'

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
    listByUser: vi.fn(),
    rotate: vi.fn(),
    deleteById: vi.fn(),
    deleteAllForUser: vi.fn(),
  },
}))

import { authRepository } from './auth.repository.js'
import { sessionsRepository } from './auth.sessions.repository.js'
import { authService } from './auth.service.js'
import * as tokens from './auth.tokens.js'
import type { UserSessionRow } from '@/db/schema/user-sessions.js'

const repo = vi.mocked(authRepository)
const sessions = vi.mocked(sessionsRepository)

const USER_ID = '11111111-2222-3333-4444-555555555555'

/**
 * In-memory stand-in for the sessions table, so rotation and reuse detection are
 * exercised for real (the DB round-trip is what auth.sessions.repository.test.ts
 * covers). Sessions live in insertion order; `listByUser` scopes by user.
 */
function useSessionStore(): UserSessionRow[] {
  const store: UserSessionRow[] = []
  let seq = 0
  sessions.create.mockImplementation(async (values) => {
    const row: UserSessionRow = {
      id: `s${++seq}`,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      label: null,
      ...values,
    }
    store.push(row)
    return row
  })
  sessions.listByUser.mockImplementation(async (userId) => store.filter((s) => s.userId === userId))
  sessions.rotate.mockImplementation(async (userId, id, values) => {
    const row = store.find((s) => s.id === id && s.userId === userId)
    if (row) Object.assign(row, values, { lastUsedAt: new Date() })
  })
  sessions.deleteById.mockImplementation(async (userId, id) => {
    const i = store.findIndex((s) => s.id === id && s.userId === userId)
    if (i >= 0) store.splice(i, 1)
  })
  sessions.deleteAllForUser.mockImplementation(async (userId) => {
    for (let i = store.length - 1; i >= 0; i--) if (store[i]?.userId === userId) store.splice(i, 1)
  })
  return store
}

function fakeUser(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: USER_ID,
    name: 'Ada',
    email: 'a@b.c',
    passwordHash: null,
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
    expect(sessions.create).toHaveBeenCalledOnce()
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
    expect(result.user.id).toBe(USER_ID)
    expect(sessions.create).toHaveBeenCalledOnce()
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
  it('rotates the session that holds the token', async () => {
    useSessionStore()
    repo.findByEmail.mockResolvedValue(fakeUser({ passwordHash: await tokens.hashSecret('pw') }))
    repo.findById.mockResolvedValue(fakeUser())

    const first = await authService.login({ email: 'a@b.c', password: 'pw' })
    const second = await authService.refresh(first.refreshToken)

    expect(second.user.id).toBe(USER_ID)
    expect(second.refreshToken).not.toBe(first.refreshToken)
    expect(sessions.rotate).toHaveBeenCalledOnce()
    expect(sessions.create).toHaveBeenCalledOnce() // rotated in place, not a new row
  })

  // The whole point of t-0cd55z: with bcrypt the replayed token compared EQUAL
  // (both tokens share their first 72 bytes) and this returned 200.
  it('detects replay of a rotated token: 401 and the whole family is revoked', async () => {
    const store = useSessionStore()
    repo.findByEmail.mockResolvedValue(fakeUser({ passwordHash: await tokens.hashSecret('pw') }))
    repo.findById.mockResolvedValue(fakeUser())

    const first = await authService.login({ email: 'a@b.c', password: 'pw' })
    const second = await authService.refresh(first.refreshToken)
    expect(store).toHaveLength(1)

    await expect(authService.refresh(first.refreshToken)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
    expect(sessions.deleteAllForUser).toHaveBeenCalledWith(USER_ID)
    expect(store).toHaveLength(0)
    // The rotated-to token dies with the family, not just the replayed one.
    await expect(authService.refresh(second.refreshToken)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
  })

  it('keeps two devices independent: each rotates its own session', async () => {
    const store = useSessionStore()
    repo.findByEmail.mockResolvedValue(fakeUser({ passwordHash: await tokens.hashSecret('pw') }))
    repo.findById.mockResolvedValue(fakeUser())

    const web = await authService.login({ email: 'a@b.c', password: 'pw' })
    const native = await authService.login({ email: 'a@b.c', password: 'pw', client: 'native' })
    expect(store).toHaveLength(2)
    expect(store.map((s) => s.client)).toEqual(['web', 'native'])

    // The second login must not evict the first — that is the single-column bug.
    const webAgain = await authService.refresh(web.refreshToken)
    const nativeAgain = await authService.refresh(native.refreshToken)
    expect(store).toHaveLength(2)

    // Logging the web session out leaves the native one working.
    await authService.logout(USER_ID, webAgain.refreshToken)
    expect(store).toHaveLength(1)
    await expect(authService.refresh(webAgain.refreshToken)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
    // ...but revoking a rotated-away token is reuse, which takes the family.
    expect(store).toHaveLength(0)
    expect(nativeAgain.refreshToken).toBeTruthy()
  })

  it('rejects an expired session even when the JWT still verifies', async () => {
    const store = useSessionStore()
    repo.findByEmail.mockResolvedValue(fakeUser({ passwordHash: await tokens.hashSecret('pw') }))
    repo.findById.mockResolvedValue(fakeUser())

    const { refreshToken } = await authService.login({ email: 'a@b.c', password: 'pw' })
    const session = store[0]
    if (!session) throw new Error('no session')
    session.expiresAt = new Date(Date.now() - 1000)

    await expect(authService.refresh(refreshToken)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    expect(sessions.deleteById).toHaveBeenCalledWith(USER_ID, session.id)
    // Expiry is not reuse: only that session dies.
    expect(sessions.deleteAllForUser).not.toHaveBeenCalled()
  })

  it('throws UNAUTHORIZED for a malformed refresh token', async () => {
    await expect(authService.refresh('garbage')).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('throws UNAUTHORIZED when the user is gone', async () => {
    useSessionStore()
    repo.findById.mockResolvedValue(null)
    await expect(authService.refresh(tokens.signRefreshToken(USER_ID))).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
  })
})

describe('authService.logout', () => {
  it('ends only the presented session', async () => {
    const store = useSessionStore()
    repo.findByEmail.mockResolvedValue(fakeUser({ passwordHash: await tokens.hashSecret('pw') }))

    const web = await authService.login({ email: 'a@b.c', password: 'pw' })
    await authService.login({ email: 'a@b.c', password: 'pw', client: 'native' })

    await authService.logout(USER_ID, web.refreshToken)
    expect(store.map((s) => s.client)).toEqual(['native'])
  })

  it('fails closed and revokes everything when no refresh token is presented', async () => {
    const store = useSessionStore()
    repo.findByEmail.mockResolvedValue(fakeUser({ passwordHash: await tokens.hashSecret('pw') }))

    await authService.login({ email: 'a@b.c', password: 'pw' })
    await authService.login({ email: 'a@b.c', password: 'pw', client: 'native' })

    await authService.logout(USER_ID, undefined)
    expect(store).toHaveLength(0)
  })
})
