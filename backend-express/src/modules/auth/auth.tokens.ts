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
  return jwt.sign({ sub: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY as NonNullable<jwt.SignOptions['expiresIn']>,
  })
}

export function verifyToken(token: string): JwtPayload {
  const env = getEnv()
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload
}

export function hashSecret(value: string): Promise<string> {
  return bcrypt.hash(value, BCRYPT_SALT_ROUNDS)
}

export function compareSecret(value: string, hash: string): Promise<boolean> {
  return bcrypt.compare(value, hash)
}
