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

/**
 * How long a session may live no matter how often it refreshes. Independent of
 * JWT_REFRESH_EXPIRY on purpose: the JWT decides how long one token is usable,
 * this decides when the user must log in again. Enforced in SQL by
 * `listByUser` (`expires_at > now()`) and reaped by the scheduler.
 */
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

/**
 * How long a just-rotated token keeps working. Two tabs waking together both
 * refresh with the same token; the one that loses the race must get a usable
 * pair back rather than be treated as a thief.
 */
const ROTATION_GRACE_MS = 30_000

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

/** True if `token` is the token this session rotated away from moments ago. */
function isRecentlyRotatedFrom(session: UserSessionRow, token: string): boolean {
  return (
    session.previousTokenHash !== null &&
    session.rotatedAt !== null &&
    Date.now() - session.rotatedAt.getTime() <= ROTATION_GRACE_MS &&
    compareToken(token, session.previousTokenHash)
  )
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

async function refresh(oldRefreshToken: string, isRetry = false): Promise<AuthResult> {
  let sub: string
  try {
    // 'refresh' only: an access token must not be able to rotate — or delete — a session.
    sub = verifyToken(oldRefreshToken, 'refresh').sub
  } catch (err) {
    throw new AppError('UNAUTHORIZED', 'Invalid or expired refresh token', err)
  }

  const user = await authRepository.findById(sub)
  if (!user) throw new AppError('UNAUTHORIZED', 'Refresh token has been revoked')

  const sessions = await sessionsRepository.listByUser(sub)
  const session =
    sessions.find((s) => compareToken(oldRefreshToken, s.tokenHash)) ??
    sessions.find((s) => isRecentlyRotatedFrom(s, oldRefreshToken))

  if (!session) {
    // No live session holds this token and the grace window has passed, so it
    // was rotated away long ago: a replay. Revoke the session it belonged to if
    // we can still name it — the user's other devices are not implicated.
    const replayed = sessions.find(
      (s) => s.previousTokenHash !== null && compareToken(oldRefreshToken, s.previousTokenHash),
    )
    if (replayed) await sessionsRepository.deleteById(sub, replayed.id)
    throw new AppError('UNAUTHORIZED', 'Refresh token reuse detected. Please log in again.')
  }

  const { refreshToken, tokenHash } = mintRefresh(user.id)
  const rotated = await sessionsRepository.rotate(sub, session.id, {
    tokenHash,
    previousTokenHash: session.tokenHash,
  })
  if (!rotated) {
    // Another request rotated between our read and our write. It stored our
    // token as `previous_token_hash`, so one re-read lands in the grace branch
    // above and hands this caller a working pair instead of a spurious logout.
    if (isRetry) throw new AppError('UNAUTHORIZED', 'Refresh token was rotated concurrently')
    return refresh(oldRefreshToken, true)
  }

  return {
    user: toPublicUser(user),
    accessToken: signAccessToken({ id: user.id, email: user.email }, session.id),
    refreshToken,
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
