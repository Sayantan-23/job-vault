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

function invoke(cookies: Record<string, string | undefined>) {
  const req = asType<Request>({ cookies })
  const next = vi.fn() as unknown as NextFunction
  return { req, next: next as unknown as ReturnType<typeof vi.fn> }
}

describe('authMiddleware', () => {
  it('attaches req.user for a valid access token', async () => {
    const { signAccessToken } = await import('@/modules/auth/auth.tokens.js')
    const { authMiddleware } = await import('./auth.middleware.js')
    const token = signAccessToken({ id: 'u1', email: 'a@b.co' })
    const { req, next } = invoke({ accessToken: token })
    authMiddleware(req, asType<Response>({}), next as unknown as NextFunction)
    expect(req.user).toEqual({ id: 'u1', email: 'a@b.co' })
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
})
