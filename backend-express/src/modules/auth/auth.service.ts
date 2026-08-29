import { AppError } from '@/shared/errors.js'
import { authRepository } from './auth.repository.js'
import { sessionsRepository } from './auth.sessions.repository.js'
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  hashSecret,
  compareSecret,
  hashToken,
  compareToken,
} from './auth.tokens.js'
import { toPublicUser, type PublicUser } from './auth.schema.js'
import type { RegisterInput, LoginInput, UpdateProfileInput } from './auth.schema.js'
import type { UserRow } from '@/db/schema/users.js'
import type { SessionClient, UserSessionRow } from '@/db/schema/user-sessions.js'

export interface AuthResult {
  user: PublicUser
  accessToken: string
  refreshToken: string
}

interface TokenPair {
  accessToken: string
  refreshToken: string
  tokenHash: string
  expiresAt: Date
}

/** Which transport this session was opened for — cookies (web) or body tokens (native, d-0cc1x6). */
function sessionClient(input: { client?: 'native' | undefined }): SessionClient {
  return input.client === 'native' ? 'native' : 'web'
}

/** A fresh pair plus what a session row needs to store for the refresh half. */
function mintTokens(user: UserRow): TokenPair {
  const accessToken = signAccessToken({ id: user.id, email: user.email })
  const refreshToken = signRefreshToken(user.id)
  return {
    accessToken,
    refreshToken,
    tokenHash: hashToken(refreshToken),
    // The JWT's own `exp` is the single source of truth for session expiry.
    expiresAt: new Date(verifyToken(refreshToken).exp * 1000),
  }
}

/** Opens a new session (login/register): one row per device, so devices don't evict each other. */
async function issueTokens(
  user: UserRow,
  client: SessionClient,
): Promise<{ accessToken: string; refreshToken: string }> {
  const { accessToken, refreshToken, tokenHash, expiresAt } = mintTokens(user)
  await sessionsRepository.create({ userId: user.id, tokenHash, client, expiresAt })
  return { accessToken, refreshToken }
}

/** The session holding this refresh token, or null if none does. */
async function findSession(userId: string, refreshToken: string): Promise<UserSessionRow | null> {
  const sessions = await sessionsRepository.listByUser(userId)
  return sessions.find((s) => compareToken(refreshToken, s.tokenHash)) ?? null
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
  const { accessToken, refreshToken } = await issueTokens(user, sessionClient(input))
  return { user: toPublicUser(user), accessToken, refreshToken }
}

async function login(input: LoginInput): Promise<AuthResult> {
  const user = await authRepository.findByEmail(input.email)
  if (!user) throw new AppError('UNAUTHORIZED', 'Invalid email or password')
  if (!user.passwordHash) {
    throw new AppError('UNAUTHORIZED', 'This account uses Google login. Please sign in with Google.')
  }
  const ok = await compareSecret(input.password, user.passwordHash)
  if (!ok) throw new AppError('UNAUTHORIZED', 'Invalid email or password')

  const { accessToken, refreshToken } = await issueTokens(user, sessionClient(input))
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
  if (!user) throw new AppError('UNAUTHORIZED', 'Refresh token has been revoked')

  const session = await findSession(sub, oldRefreshToken)
  if (!session) {
    // Correctly signed but held by no session: this token was already rotated
    // away, so it is a replay — the legitimate holder and the thief are
    // indistinguishable from here. Revoke the whole family and make both log in.
    await sessionsRepository.deleteAllForUser(sub)
    throw new AppError('UNAUTHORIZED', 'Refresh token reuse detected. Please log in again.')
  }

  // Independent of JWT expiry: a session revoked by date must die even if the
  // signed token still verifies (clock skew, a shortened JWT_REFRESH_EXPIRY).
  if (session.expiresAt.getTime() <= Date.now()) {
    await sessionsRepository.deleteById(sub, session.id)
    throw new AppError('UNAUTHORIZED', 'Session has expired. Please log in again.')
  }

  const { accessToken, refreshToken, tokenHash, expiresAt } = mintTokens(user)
  await sessionsRepository.rotate(sub, session.id, { tokenHash, expiresAt })
  return { user: toPublicUser(user), accessToken, refreshToken }
}

/**
 * Ends the session the caller presents its refresh token for, leaving the
 * user's other devices signed in. Without a usable token we cannot tell the
 * devices apart, so we fail closed and revoke all of them rather than leave a
 * live refresh token behind a "signed out" screen.
 */
async function logout(userId: string, refreshToken?: string): Promise<void> {
  const session = refreshToken ? await findSession(userId, refreshToken) : null
  if (session) await sessionsRepository.deleteById(userId, session.id)
  else await sessionsRepository.deleteAllForUser(userId)
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
