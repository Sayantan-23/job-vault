import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

beforeAll(() => {
  process.env['NODE_ENV'] = 'test'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['DATABASE_URL'] = 'postgres://x:x@x:5432/x'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  process.env['JWT_ACCESS_EXPIRY'] = '15m'
  process.env['JWT_REFRESH_EXPIRY'] = '7d'
  process.env['LOG_LEVEL'] = 'silent'
})

interface FakeSocket {
  handshake: { headers: { cookie?: string }; auth?: Record<string, unknown> }
  data: { userId?: string }
}

function fakeSocket(cookie?: string, auth?: Record<string, unknown>): FakeSocket {
  return {
    handshake: { headers: cookie === undefined ? {} : { cookie }, ...(auth ? { auth } : {}) },
    data: {},
  }
}

describe('parseAccessTokenCookie', () => {
  it('extracts the accessToken value from a cookie header', async () => {
    const { parseAccessTokenCookie } = await import('./socket.js')
    expect(parseAccessTokenCookie('foo=1; accessToken=abc.def.ghi; bar=2')).toBe('abc.def.ghi')
  })

  it('returns undefined when the header is missing or has no accessToken', async () => {
    const { parseAccessTokenCookie } = await import('./socket.js')
    expect(parseAccessTokenCookie(undefined)).toBeUndefined()
    expect(parseAccessTokenCookie('foo=1; bar=2')).toBeUndefined()
  })
})

describe('socketAuthMiddleware', () => {
  it('attaches socket.data.userId for a valid signed cookie', async () => {
    const { signAccessToken } = await import('@/modules/auth/auth.tokens.js')
    const { socketAuthMiddleware } = await import('./socket.js')
    const token = signAccessToken({ id: 'u1', email: 'a@b.c' })
    const socket = fakeSocket(`accessToken=${token}`)
    const next = vi.fn()
    socketAuthMiddleware(socket as never, next)
    expect(next).toHaveBeenCalledWith()
    expect(socket.data.userId).toBe('u1')
  })

  it('rejects a missing cookie with an unauthorized error', async () => {
    const { socketAuthMiddleware } = await import('./socket.js')
    const socket = fakeSocket(undefined)
    const next = vi.fn()
    socketAuthMiddleware(socket as never, next)
    const err = next.mock.calls[0]?.[0] as Error
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe('unauthorized')
    expect(socket.data.userId).toBeUndefined()
  })

  it('rejects an invalid token with an unauthorized error', async () => {
    const { socketAuthMiddleware } = await import('./socket.js')
    const socket = fakeSocket('accessToken=not-a-real-jwt')
    const next = vi.fn()
    socketAuthMiddleware(socket as never, next)
    const err = next.mock.calls[0]?.[0] as Error
    expect(err.message).toBe('unauthorized')
  })

  // Native clients have no cookie jar and pass the token in the handshake
  // instead (d-0cc1x6) — otherwise realtime silently never connects.
  it('attaches socket.data.userId for a valid handshake auth token', async () => {
    const { signAccessToken } = await import('@/modules/auth/auth.tokens.js')
    const { socketAuthMiddleware } = await import('./socket.js')
    const token = signAccessToken({ id: 'u2', email: 'n@b.c' })
    const socket = fakeSocket(undefined, { token })
    const next = vi.fn()
    socketAuthMiddleware(socket as never, next)
    expect(next).toHaveBeenCalledWith()
    expect(socket.data.userId).toBe('u2')
  })

  it('prefers the handshake auth token over the cookie', async () => {
    const { signAccessToken } = await import('@/modules/auth/auth.tokens.js')
    const { socketAuthMiddleware } = await import('./socket.js')
    const cookieToken = signAccessToken({ id: 'cookie-user', email: 'c@b.c' })
    const authToken = signAccessToken({ id: 'auth-user', email: 'n@b.c' })
    const socket = fakeSocket(`accessToken=${cookieToken}`, { token: authToken })
    const next = vi.fn()
    socketAuthMiddleware(socket as never, next)
    expect(socket.data.userId).toBe('auth-user')
  })

  it('falls back to the cookie when the handshake auth token is absent or not a string', async () => {
    const { signAccessToken } = await import('@/modules/auth/auth.tokens.js')
    const { socketAuthMiddleware } = await import('./socket.js')
    const token = signAccessToken({ id: 'u1', email: 'a@b.c' })
    const socket = fakeSocket(`accessToken=${token}`, { token: 42 })
    const next = vi.fn()
    socketAuthMiddleware(socket as never, next)
    expect(socket.data.userId).toBe('u1')
  })

  it('rejects an invalid handshake auth token', async () => {
    const { socketAuthMiddleware } = await import('./socket.js')
    const socket = fakeSocket(undefined, { token: 'not-a-real-jwt' })
    const next = vi.fn()
    socketAuthMiddleware(socket as never, next)
    const err = next.mock.calls[0]?.[0] as Error
    expect(err.message).toBe('unauthorized')
  })
})

describe('emitToUser', () => {
  beforeEach(async () => {
    const { setIo } = await import('./socket.js')
    setIo(undefined)
  })

  it('is a no-op (does not throw) when io is unset', async () => {
    const { emitToUser } = await import('./socket.js')
    expect(() => emitToUser('u1', 'notification', { id: 'n1' })).not.toThrow()
  })

  it('emits to the user room when io is set', async () => {
    const emit = vi.fn()
    const to = vi.fn(() => ({ emit }))
    const { setIo, emitToUser } = await import('./socket.js')
    const fakeIo = { to }
    setIo(fakeIo as never)
    emitToUser('u1', 'notification', { id: 'n1' })
    expect(to).toHaveBeenCalledWith('u1')
    expect(emit).toHaveBeenCalledWith('notification', { id: 'n1' })
  })
})
