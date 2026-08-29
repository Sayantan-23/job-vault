import type { Request, Response } from 'express'
import { AppError } from '@/shared/errors.js'
import { authService, type AuthResult } from './auth.service.js'
import { setAuthCookies, clearAuthCookies } from './auth.cookies.js'
import type { PublicUser, RegisterInput, LoginInput, UpdateProfileInput } from './auth.schema.js'

function requireUserId(req: Request): string {
  const id = req.user?.id
  if (!id) throw new AppError('UNAUTHORIZED', 'Authentication required')
  return id
}

interface NativeAuthData {
  user: PublicUser
  accessToken: string
  refreshToken: string
}

/**
 * Build the `data` payload for an authentication result. Web keeps the tokens
 * out of JS reach entirely — they go out as HTTP-only cookies and the body
 * carries only the user. A native client has no cookie jar, so the pair rides
 * in the body instead (d-0cc1x6).
 */
function authData(res: Response, result: AuthResult, native: boolean): PublicUser | NativeAuthData {
  if (native) {
    return { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken }
  }
  setAuthCookies(res, result.accessToken, result.refreshToken)
  return result.user
}

async function register(req: Request, res: Response): Promise<void> {
  const input = req.body as RegisterInput
  const result = await authService.register(input)
  res.status(201).json({ data: authData(res, result, input.client === 'native') })
}

async function login(req: Request, res: Response): Promise<void> {
  const input = req.body as LoginInput
  const result = await authService.login(input)
  res.status(200).json({ data: authData(res, result, input.client === 'native') })
}

async function refresh(req: Request, res: Response): Promise<void> {
  // Native mode is selected by input source, never by a header: only a client
  // that already holds the refresh token can put it in the body, so a browser
  // XSS cannot ask for the HttpOnly pair to be echoed back (d-0cc1x6).
  const bodyToken = (req.body as { refreshToken?: unknown } | undefined)?.refreshToken
  const native = typeof bodyToken === 'string' && bodyToken.length > 0
  const token = native ? bodyToken : (req.cookies?.['refreshToken'] as string | undefined)
  if (!token) throw new AppError('UNAUTHORIZED', 'No refresh token')
  const result = await authService.refresh(token)
  res.status(200).json({ data: authData(res, result, native) })
}

async function logout(req: Request, res: Response): Promise<void> {
  await authService.logout(requireUserId(req))
  clearAuthCookies(res)
  res.status(200).json({ data: { message: 'Logged out successfully' } })
}

async function me(req: Request, res: Response): Promise<void> {
  const user = await authService.getProfile(requireUserId(req))
  res.status(200).json({ data: user })
}

async function updateProfile(req: Request, res: Response): Promise<void> {
  const user = await authService.updateProfile(requireUserId(req), req.body as UpdateProfileInput)
  res.status(200).json({ data: user })
}

export const authController = { register, login, refresh, logout, me, updateProfile }
