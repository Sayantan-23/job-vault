import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { getEnv } from '@/config/env.js'

const BCRYPT_SALT_ROUNDS = 12

export interface JwtPayload {
  sub: string
  email?: string
  iat: number
  exp: number
}

export function signAccessToken(user: { id: string; email: string }): string {
  const env = getEnv()
  return jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY as NonNullable<jwt.SignOptions['expiresIn']>,
  })
}

export function signRefreshToken(userId: string): string {
  const env = getEnv()
  // `jti` is what makes each refresh token distinct: `iat`/`exp` are whole
  // seconds, so without it two tokens minted for the same user inside one
  // second are byte-identical — rotation would be a no-op and the new session
  // would collide with the old one on the unique token hash.
  return jwt.sign({ sub: userId, jti: randomUUID() }, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY as NonNullable<jwt.SignOptions['expiresIn']>,
  })
}

export function verifyToken(token: string): JwtPayload {
  const env = getEnv()
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload
}

/**
 * bcrypt — for passwords and API keys only. It truncates its input at 72 bytes,
 * so anything longer (a refresh JWT is ~171 chars) must use `hashToken`.
 */
export function hashSecret(value: string): Promise<string> {
  return bcrypt.hash(value, BCRYPT_SALT_ROUNDS)
}

export function compareSecret(value: string, hash: string): Promise<boolean> {
  return bcrypt.compare(value, hash)
}

/**
 * Refresh tokens are already high-entropy signed values, so a password KDF buys
 * nothing — and bcrypt is actively wrong here: it truncates at 72 bytes, and two
 * refresh JWTs for the same user differ only past that cut, so every rotation
 * compared equal and reuse detection never fired (t-0cd55z).
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Constant-time compare of a raw token against a stored `hashToken` digest. */
export function compareToken(token: string, hash: string): boolean {
  const expected = Buffer.from(hashToken(token))
  const actual = Buffer.from(hash)
  // timingSafeEqual throws on differing lengths, so the guard comes first.
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
