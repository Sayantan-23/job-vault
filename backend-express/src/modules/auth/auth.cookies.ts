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
  // Site-wide path (not scoped to /api/auth) so the Next middleware can see the
  // refresh token on /app/* requests and the browser sends it on the same-origin
  // silent-refresh call. Still HttpOnly + SameSite=Lax + Secure(prod).
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: REFRESH_MAX_AGE,
    path: '/',
  })
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie('accessToken', { path: '/' })
  res.clearCookie('refreshToken', { path: '/' })
}
