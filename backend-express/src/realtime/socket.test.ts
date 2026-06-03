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
  handshake: { headers: { cookie?: string } }
  data: { userId?: string }
}

function fakeSocket(cookie?: string): FakeSocket {
  return { handshake: { headers: cookie === undefined ? {} : { cookie } }, data: {} }
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
