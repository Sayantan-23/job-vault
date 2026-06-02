import type { Response } from 'express'
import { getEnv } from '@/config/env.js'

const ACCESS_MAX_AGE = 15 * 60 * 1000
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const secure = getEnv().NODE_ENV === 'production'
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: ACCESS_MAX_AGE,
    path: '/',
  })
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: REFRESH_MAX_AGE,
    path: '/api/auth',
  })
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie('accessToken', { path: '/' })
  res.clearCookie('refreshToken', { path: '/api/auth' })
}
