import { AppError } from '@/shared/errors.js'
import { authRepository } from './auth.repository.js'
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  hashSecret,
  compareSecret,
} from './auth.tokens.js'
import { toPublicUser, type PublicUser } from './auth.schema.js'
import type { RegisterInput, LoginInput, UpdateProfileInput } from './auth.schema.js'
import type { UserRow } from '@/db/schema/users.js'

export interface AuthResult {
  user: PublicUser
  accessToken: string
  refreshToken: string
}

async function issueTokens(user: UserRow): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = signAccessToken({ id: user.id, email: user.email })
  const refreshToken = signRefreshToken(user.id)
  await authRepository.setRefreshTokenHash(user.id, await hashSecret(refreshToken))
  return { accessToken, refreshToken }
}

async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await authRepository.findByEmail(input.email)
  if (existing) throw new AppError('CONFLICT', 'Email already registered')

  const passwordHash = await hashSecret(input.password)
  const user = await authRepository.create({
    name: input.name,
    email: input.email,
    passwordHash,
  })
  const { accessToken, refreshToken } = await issueTokens(user)
  return { user: toPublicUser(user), accessToken, refreshToken }
}

async function login(input: LoginInput): Promise<AuthResult> {
  const user = await authRepository.findByEmail(input.email)
  if (!user) throw new AppError('UNAUTHORIZED', 'Invalid email or password')
  if (!user.passwordHash) {
    throw new AppError('UNAUTHORIZED', 'This account uses Google login.')
  }
  const ok = await compareSecret(input.password, user.passwordHash)
  if (!ok) throw new AppError('UNAUTHORIZED', 'Invalid email or password')

  const { accessToken, refreshToken } = await issueTokens(user)
  return { user: toPublicUser(user), accessToken, refreshToken }
}

async function refresh(oldRefreshToken: string): Promise<AuthResult> {
  let sub: string
  try {
    sub = verifyToken(oldRefreshToken).sub
  } catch (err) {
    throw new AppError('UNAUTHORIZED', 'Invalid or expired refresh token', err)
  }

  const user = await authRepository.findById(sub)
  if (!user || !user.refreshTokenHash) {
    throw new AppError('UNAUTHORIZED', 'Refresh token has been revoked')
  }

  const matches = await compareSecret(oldRefreshToken, user.refreshTokenHash)
  if (!matches) {
    await authRepository.clearRefreshTokenHash(user.id)
    throw new AppError('UNAUTHORIZED', 'Refresh token reuse detected. Please log in again.')
  }

  const { accessToken, refreshToken } = await issueTokens(user)
  return { user: toPublicUser(user), accessToken, refreshToken }
}

async function logout(userId: string): Promise<void> {
  await authRepository.clearRefreshTokenHash(userId)
}

async function getProfile(userId: string): Promise<PublicUser> {
  const user = await authRepository.findById(userId)
  if (!user) throw new AppError('NOT_FOUND', 'User not found')
  return toPublicUser(user)
}

async function updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
  const existing = await authRepository.findById(userId)
  if (!existing) throw new AppError('NOT_FOUND', 'User not found')
  const updated = await authRepository.updateProfile(userId, input)
  return toPublicUser(updated)
}

export const authService = {
  register,
  login,
  refresh,
  logout,
  getProfile,
  updateProfile,
}
