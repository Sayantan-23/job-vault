import type { Request, Response } from 'express'
import { AppError } from '@/shared/errors.js'
import { authService } from './auth.service.js'
import { setAuthCookies, clearAuthCookies } from './auth.cookies.js'
import type { RegisterInput, LoginInput, UpdateProfileInput } from './auth.schema.js'

function requireUserId(req: Request): string {
  const id = req.user?.id
  if (!id) throw new AppError('UNAUTHORIZED', 'Authentication required')
  return id
}

async function register(req: Request, res: Response): Promise<void> {
  const result = await authService.register(req.body as RegisterInput)
  setAuthCookies(res, result.accessToken, result.refreshToken)
  res.status(201).json({ data: result.user })
}

async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.login(req.body as LoginInput)
  setAuthCookies(res, result.accessToken, result.refreshToken)
  res.status(200).json({ data: result.user })
}

async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.['refreshToken'] as string | undefined
  if (!token) throw new AppError('UNAUTHORIZED', 'No refresh token')
  const result = await authService.refresh(token)
  setAuthCookies(res, result.accessToken, result.refreshToken)
  res.status(200).json({ data: result.user })
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
