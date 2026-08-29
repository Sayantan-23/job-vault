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
import type { SessionClient } from '@/db/schema/user-sessions.js'

export interface AuthResult {
  user: PublicUser
  accessToken: string
  /**
   * Absent when a refresh landed inside another request's rotation grace
   * window: the caller keeps the refresh token it already holds (the winner's)
   * and only the access token is renewed. Web sends no refresh Set-Cookie in
   * that case; a native client must keep its stored token.
   */
  refreshToken?: string
}

/**
 * How long a session may live no matter how often it refreshes. Independent of
 * JWT_REFRESH_EXPIRY on purpose: the JWT decides how long one token is usable,
 * this decides when the user must log in again. Enforced in SQL by
 * `listByUser` (`expires_at > now()`) and reaped by the scheduler.
 */
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

/** Which transport this session was opened for — cookies (web) or body tokens (native, d-0cc1x6). */
function sessionClient(input: { client?: 'native' | undefined }): SessionClient {
  return input.client === 'native' ? 'native' : 'web'
}

function mintRefresh(userId: string): { refreshToken: string; tokenHash: string } {
  const refreshToken = signRefreshToken(userId)
  return { refreshToken, tokenHash: hashToken(refreshToken) }
}

/** Opens a new session (login/register): one row per device, so devices don't evict each other. */
async function issueTokens(
  user: UserRow,
  client: SessionClient,
): Promise<{ accessToken: string; refreshToken: string }> {
  const { refreshToken, tokenHash } = mintRefresh(user.id)
  const session = await sessionsRepository.create({
    userId: user.id,
    tokenHash,
    client,
    expiresAt: new Date(Date.now() + SESSION_MAX_AGE_MS),
  })
  // The access token names its session, so logout revokes exactly this device.
  return { accessToken: signAccessToken({ id: user.id, email: user.email }, session.id), refreshToken }
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
    // 'refresh' only: an access token must not be able to rotate — or delete — a session.
    sub = verifyToken(oldRefreshToken, 'refresh').sub
  } catch (err) {
    throw new AppError('UNAUTHORIZED', 'Invalid or expired refresh token', err)
  }

  const user = await authRepository.findById(sub)
  if (!user) throw new AppError('UNAUTHORIZED', 'Refresh token has been revoked')

  // Advisory read: names the row and compares hashes in constant time. The
  // UPDATE below is the authority on whether this token may still be used.
  const sessions = await sessionsRepository.listByUser(sub)
  const session =
    sessions.find((s) => compareToken(oldRefreshToken, s.tokenHash)) ??
    sessions.find(
      (s) => s.previousTokenHash !== null && compareToken(oldRefreshToken, s.previousTokenHash),
    )
  if (!session) {
    // Held by no live session and not attributable to one: already dead, so
    // there is nothing to revoke and no reuse to report.
    throw new AppError('UNAUTHORIZED', 'Refresh token has been revoked')
  }

  const { refreshToken, tokenHash } = mintRefresh(user.id)
  const updated = await sessionsRepository.rotate(sub, session.id, {
    tokenHash,
    previousTokenHash: hashToken(oldRefreshToken),
  })
  if (!updated) {
    // The session is alive but this token is neither its current one nor inside
    // the grace window: rotated away long ago, so this is a replay. Only the
    // session it belonged to dies — the user's other devices are untouched.
    await sessionsRepository.deleteById(sub, session.id)
    throw new AppError('UNAUTHORIZED', 'Refresh token reuse detected. Please log in again.')
  }

  return {
    user: toPublicUser(user),
    accessToken: signAccessToken({ id: user.id, email: user.email }, session.id),
    // Only the arm that actually rotated hands out a refresh token.
    ...(updated.tokenHash === tokenHash ? { refreshToken } : {}),
  }
}

/**
 * Ends the session named by the access token's `sid`, leaving the user's other
 * devices signed in. A credential minted without one cannot say which device it
 * is, so we fail closed and revoke all of them rather than leave a live refresh
 * token behind a "signed out" screen.
 */
async function logout(userId: string, sessionId: string | undefined): Promise<void> {
  if (sessionId) await sessionsRepository.deleteById(userId, sessionId)
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
