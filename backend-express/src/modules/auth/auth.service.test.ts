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
    deleteExpired: vi.fn(),
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
 * In-memory stand-in for the sessions table, so rotation, the grace window and
 * reuse detection are exercised for real (the DB round-trip is what
 * auth.sessions.repository.test.ts covers). `rotate` models the compare-and-swap
 * and `listByUser` the `expires_at > now()` filter, because both are load-bearing.
 */
let store: UserSessionRow[]

function useSessionStore(): UserSessionRow[] {
  const rows: UserSessionRow[] = []
  let seq = 0
  sessions.create.mockImplementation(async (values) => {
    const row: UserSessionRow = {
      id: `s${++seq}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUsedAt: new Date(),
      previousTokenHash: null,
      rotatedAt: null,
      ...values,
    }
    rows.push(row)
    return row
  })
  sessions.listByUser.mockImplementation(async (userId) =>
    rows.filter((s) => s.userId === userId && s.expiresAt.getTime() > Date.now()),
  )
  sessions.rotate.mockImplementation(async (userId, id, values) => {
    const row = rows.find(
      (s) => s.id === id && s.userId === userId && s.tokenHash === values.previousTokenHash,
    )
    if (!row) return false
    Object.assign(row, values, { rotatedAt: new Date(), lastUsedAt: new Date() })
    return true
  })
  sessions.deleteById.mockImplementation(async (userId, id) => {
    const i = rows.findIndex((s) => s.id === id && s.userId === userId)
    if (i >= 0) rows.splice(i, 1)
  })
  sessions.deleteAllForUser.mockImplementation(async (userId) => {
    for (let i = rows.length - 1; i >= 0; i--) if (rows[i]?.userId === userId) rows.splice(i, 1)
  })
  return rows
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
  store = useSessionStore()
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
  /** Log in and return the session store plus the first refresh token. */
  async function loggedIn(client?: 'native') {
    repo.findByEmail.mockResolvedValue(fakeUser({ passwordHash: await tokens.hashSecret('pw') }))
    repo.findById.mockResolvedValue(fakeUser())
    return authService.login({ email: 'a@b.c', password: 'pw', ...(client ? { client } : {}) })
  }

  it('rotates the session that holds the token, in place', async () => {
    const first = await loggedIn()
    const second = await authService.refresh(first.refreshToken)

    expect(second.user.id).toBe(USER_ID)
    expect(second.refreshToken).not.toBe(first.refreshToken)
    expect(store).toHaveLength(1)
    expect(store[0]?.tokenHash).toBe(tokens.hashToken(second.refreshToken))
    expect(store[0]?.previousTokenHash).toBe(tokens.hashToken(first.refreshToken))
  })

  it('refuses an access token: it must not rotate or revoke anything', async () => {
    await loggedIn()
    const access = tokens.signAccessToken({ id: USER_ID, email: 'a@b.c' }, 's1')
    await expect(authService.refresh(access)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    expect(store).toHaveLength(1)
    expect(sessions.deleteById).not.toHaveBeenCalled()
    expect(sessions.deleteAllForUser).not.toHaveBeenCalled()
  })

  // Two tabs waking together present the same token. Both must end up signed in.
  it('lets the loser of a concurrent rotation through the grace window', async () => {
    const first = await loggedIn()
    const [a, b] = await Promise.all([
      authService.refresh(first.refreshToken),
      authService.refresh(first.refreshToken),
    ])
    expect(a.refreshToken).toBeTruthy()
    expect(b.refreshToken).toBeTruthy()
    expect(a.refreshToken).not.toBe(b.refreshToken)
    expect(store).toHaveLength(1) // one session, rotated twice — nobody was revoked
  })

  it('accepts the just-rotated token again within the grace window', async () => {
    const first = await loggedIn()
    await authService.refresh(first.refreshToken)
    const retry = await authService.refresh(first.refreshToken)
    expect(retry.refreshToken).toBeTruthy()
    expect(store).toHaveLength(1)
  })

  // The whole point of t-0cd55z: with bcrypt the replayed token compared EQUAL
  // and this returned 200.
  it('detects replay past the grace window: 401, and only that session dies', async () => {
    const web = await loggedIn()
    await loggedIn('native')
    await authService.refresh(web.refreshToken)
    const webSession = store[0]
    if (!webSession) throw new Error('no session')
    webSession.rotatedAt = new Date(Date.now() - 60_000) // past the grace window

    await expect(authService.refresh(web.refreshToken)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
    expect(sessions.deleteById).toHaveBeenCalledWith(USER_ID, webSession.id)
    // Scoped revocation: the phone stays signed in.
    expect(sessions.deleteAllForUser).not.toHaveBeenCalled()
    expect(store.map((s) => s.client)).toEqual(['native'])
  })

  it('401s on an unattributable token without revoking anything', async () => {
    await loggedIn()
    const stranger = tokens.signRefreshToken(USER_ID)
    await expect(authService.refresh(stranger)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    expect(store).toHaveLength(1)
    expect(sessions.deleteAllForUser).not.toHaveBeenCalled()
  })

  it('keeps two devices independent: each rotates its own session', async () => {
    const web = await loggedIn()
    const native = await loggedIn('native')
    expect(store.map((s) => s.client)).toEqual(['web', 'native'])

    // The second login must not evict the first — that is the single-column bug.
    const webAgain = await authService.refresh(web.refreshToken)
    const nativeAgain = await authService.refresh(native.refreshToken)
    expect(store).toHaveLength(2)
    expect(webAgain.refreshToken).not.toBe(nativeAgain.refreshToken)

    // Logging the web session out leaves the phone able to refresh.
    await authService.logout(USER_ID, store[0]?.id)
    expect(store.map((s) => s.client)).toEqual(['native'])
    await expect(authService.refresh(nativeAgain.refreshToken)).resolves.toMatchObject({
      user: { id: USER_ID },
    })
  })

  it('rejects a session past its absolute cap even though the JWT still verifies', async () => {
    const { refreshToken } = await loggedIn()
    const session = store[0]
    if (!session) throw new Error('no session')
    session.expiresAt = new Date(Date.now() - 1000)

    await expect(authService.refresh(refreshToken)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    expect(sessions.rotate).not.toHaveBeenCalled()
  })

  it('throws UNAUTHORIZED for a malformed refresh token', async () => {
    await expect(authService.refresh('garbage')).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('throws UNAUTHORIZED when the user is gone', async () => {
    repo.findById.mockResolvedValue(null)
    await expect(authService.refresh(tokens.signRefreshToken(USER_ID))).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
  })
})

describe('authService.logout', () => {
  it('ends only the session named by the access token', async () => {
    repo.findByEmail.mockResolvedValue(fakeUser({ passwordHash: await tokens.hashSecret('pw') }))
    await authService.login({ email: 'a@b.c', password: 'pw' })
    await authService.login({ email: 'a@b.c', password: 'pw', client: 'native' })

    await authService.logout(USER_ID, store[0]?.id)
    expect(store.map((s) => s.client)).toEqual(['native'])
  })

  it('fails closed and revokes everything for a credential with no session id', async () => {
    repo.findByEmail.mockResolvedValue(fakeUser({ passwordHash: await tokens.hashSecret('pw') }))
    await authService.login({ email: 'a@b.c', password: 'pw' })
    await authService.login({ email: 'a@b.c', password: 'pw', client: 'native' })

    await authService.logout(USER_ID, undefined)
    expect(store).toHaveLength(0)
  })
})
