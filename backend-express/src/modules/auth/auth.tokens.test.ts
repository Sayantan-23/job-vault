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

  // The bug t-0cd55z: the old test compared against the literal
  // 'a-different-token', whose first 72 bytes genuinely differ. Two REAL refresh
  // JWTs for one user share those bytes, so bcrypt.compare said "same".
  it('hashes two real refresh tokens for the same user to different digests', async () => {
    const { signRefreshToken, hashToken, compareToken } = await import('./auth.tokens.js')
    // A real user id (UUID) — that is what pushes everything distinguishing the
    // two tokens past bcrypt's 72-byte cut.
    const userId = '11111111-2222-3333-4444-555555555555'
    const a = signRefreshToken(userId)
    const b = signRefreshToken(userId)
    expect(a).not.toBe(b)
    expect(a.slice(0, 72)).toBe(b.slice(0, 72))
    expect(hashToken(a)).not.toBe(hashToken(b))
    expect(compareToken(a, hashToken(a))).toBe(true)
    expect(compareToken(b, hashToken(a))).toBe(false)
  })

  it('compareToken returns false (never throws) for a malformed stored hash', async () => {
    const { hashToken, compareToken } = await import('./auth.tokens.js')
    expect(hashToken('x')).toHaveLength(64)
    expect(compareToken('x', '')).toBe(false)
    expect(compareToken('x', 'short')).toBe(false)
    // A bcrypt hash left over from before the migration must not match either.
    expect(compareToken('x', '$2b$12$' + 'a'.repeat(53))).toBe(false)
  })
})
