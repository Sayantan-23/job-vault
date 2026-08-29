import { describe, it, expect, vi, beforeAll } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

beforeAll(() => {
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['DATABASE_URL'] = 'postgres://x:x@x:5432/x'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  process.env['JWT_ACCESS_EXPIRY'] = '15m'
  process.env['JWT_REFRESH_EXPIRY'] = '7d'
})

// Small typed-cast helper: keeps object literals out of `as`-assertions so the
// `objectLiteralTypeAssertions: 'never'` lint rule is satisfied.
const asType = <T>(value: unknown): T => value as T

function invoke(
  cookies: Record<string, string | undefined>,
  headers: Record<string, string> = {},
) {
  const req = asType<Request>({ cookies, headers })
  const next = vi.fn() as unknown as NextFunction
  return { req, next: next as unknown as ReturnType<typeof vi.fn> }
}

describe('authMiddleware', () => {
  it('attaches req.user for a valid access token', async () => {
    const { signAccessToken } = await import('@/modules/auth/auth.tokens.js')
    const { authMiddleware } = await import('./auth.middleware.js')
    const token = signAccessToken({ id: 'u1', email: 'a@b.co' }, 's1')
    const { req, next } = invoke({ accessToken: token })
    authMiddleware(req, asType<Response>({}), next as unknown as NextFunction)
    expect(req.user).toEqual({ id: 'u1', email: 'a@b.co', sid: 's1' })
    expect(next.mock.calls[0]).toEqual([])
  })

  it('forwards UNAUTHORIZED when no token cookie is present', async () => {
    const { authMiddleware } = await import('./auth.middleware.js')
    const { AppError } = await import('@/shared/errors.js')
    const { req, next } = invoke({})
    authMiddleware(req, asType<Response>({}), next as unknown as NextFunction)
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(AppError)
    expect(next.mock.calls[0]?.[0]?.code).toBe('UNAUTHORIZED')
  })

  it('forwards UNAUTHORIZED for an invalid token', async () => {
    const { authMiddleware } = await import('./auth.middleware.js')
    const { AppError } = await import('@/shared/errors.js')
    const { req, next } = invoke({ accessToken: 'garbage' })
    authMiddleware(req, asType<Response>({}), next as unknown as NextFunction)
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(AppError)
  })

  // Native clients have no cookie jar and send the access token as a Bearer
  // header instead (d-0cc1x6).
  it('attaches req.user for a valid Authorization: Bearer token', async () => {
    const { signAccessToken } = await import('@/modules/auth/auth.tokens.js')
    const { authMiddleware } = await import('./auth.middleware.js')
    const token = signAccessToken({ id: 'u2', email: 'n@b.co' }, 's1')
    const { req, next } = invoke({}, { authorization: `Bearer ${token}` })
    authMiddleware(req, asType<Response>({}), next as unknown as NextFunction)
    expect(req.user).toEqual({ id: 'u2', email: 'n@b.co', sid: 's1' })
    expect(next.mock.calls[0]).toEqual([])
  })

  it('accepts a lowercase bearer scheme', async () => {
    const { signAccessToken } = await import('@/modules/auth/auth.tokens.js')
    const { authMiddleware } = await import('./auth.middleware.js')
    const token = signAccessToken({ id: 'u2', email: 'n@b.co' }, 's1')
    const { req, next } = invoke({}, { authorization: `bearer ${token}` })
    authMiddleware(req, asType<Response>({}), next as unknown as NextFunction)
    expect(req.user?.id).toBe('u2')
  })

  it('prefers the Bearer header over the cookie', async () => {
    const { signAccessToken } = await import('@/modules/auth/auth.tokens.js')
    const { authMiddleware } = await import('./auth.middleware.js')
    const bearer = signAccessToken({ id: 'bearer-user', email: 'n@b.co' }, 's1')
    const cookie = signAccessToken({ id: 'cookie-user', email: 'c@b.co' }, 's1')
    const { req, next } = invoke({ accessToken: cookie }, { authorization: `Bearer ${bearer}` })
    authMiddleware(req, asType<Response>({}), next as unknown as NextFunction)
    expect(req.user?.id).toBe('bearer-user')
  })

  it('forwards UNAUTHORIZED for a malformed Bearer token', async () => {
    const { authMiddleware } = await import('./auth.middleware.js')
    const { AppError } = await import('@/shared/errors.js')
    const { req, next } = invoke({}, { authorization: 'Bearer garbage' })
    authMiddleware(req, asType<Response>({}), next as unknown as NextFunction)
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(AppError)
  })

  it('forwards UNAUTHORIZED for an Authorization header with no Bearer scheme', async () => {
    const { authMiddleware } = await import('./auth.middleware.js')
    const { AppError } = await import('@/shared/errors.js')
    const { req, next } = invoke({}, { authorization: 'Basic abc' })
    authMiddleware(req, asType<Response>({}), next as unknown as NextFunction)
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(AppError)
  })

  // A refresh token is signed with the same secret; only its `typ` claim keeps
  // it from being a 7-day Bearer credential for the whole account (t-0cd55z).
  it('rejects a refresh token, as a cookie and as a Bearer credential', async () => {
    const { signRefreshToken } = await import('@/modules/auth/auth.tokens.js')
    const { authMiddleware } = await import('./auth.middleware.js')
    const { AppError } = await import('@/shared/errors.js')
    const refresh = signRefreshToken('u1')

    const viaCookie = invoke({ accessToken: refresh })
    authMiddleware(viaCookie.req, asType<Response>({}), viaCookie.next as unknown as NextFunction)
    expect(viaCookie.req.user).toBeUndefined()
    expect(viaCookie.next.mock.calls[0]?.[0]).toBeInstanceOf(AppError)

    const viaBearer = invoke({}, { authorization: `Bearer ${refresh}` })
    authMiddleware(viaBearer.req, asType<Response>({}), viaBearer.next as unknown as NextFunction)
    expect(viaBearer.req.user).toBeUndefined()
    expect(viaBearer.next.mock.calls[0]?.[0]).toBeInstanceOf(AppError)
  })
})
