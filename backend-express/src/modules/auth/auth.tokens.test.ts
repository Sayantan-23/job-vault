import { describe, it, expect, beforeAll } from 'vitest'

beforeAll(() => {
  // getEnv() validates the whole schema, so set every required var.
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['DATABASE_URL'] = 'postgres://x:x@x:5432/x'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  process.env['JWT_ACCESS_EXPIRY'] = '15m'
  process.env['JWT_REFRESH_EXPIRY'] = '7d'
})

describe('auth.tokens', () => {
  it('signs and verifies an access token carrying sub + email', async () => {
    const { signAccessToken, verifyToken } = await import('./auth.tokens.js')
    const token = signAccessToken({ id: 'u1', email: 'a@b.c' })
    const payload = verifyToken(token)
    expect(payload.sub).toBe('u1')
    expect(payload.email).toBe('a@b.c')
  })

  it('signs a refresh token carrying only sub', async () => {
    const { signRefreshToken, verifyToken } = await import('./auth.tokens.js')
    const token = signRefreshToken('u1')
    const payload = verifyToken(token)
    expect(payload.sub).toBe('u1')
  })

  it('throws on a tampered token', async () => {
    const { verifyToken } = await import('./auth.tokens.js')
    expect(() => verifyToken('not.a.jwt')).toThrow()
  })

  it('hashes a secret and verifies it with bcrypt', async () => {
    const { hashSecret, compareSecret } = await import('./auth.tokens.js')
    const hash = await hashSecret('refresh-token-value')
    expect(hash).not.toBe('refresh-token-value')
    expect(await compareSecret('refresh-token-value', hash)).toBe(true)
    expect(await compareSecret('wrong', hash)).toBe(false)
  })
})
