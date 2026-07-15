/**
 * A `/app/*` request is allowed through as long as the session is *reachable* —
 * i.e. either auth cookie is present. The access token is short-lived (15m); when
 * it expires the refresh token (7d) is still there and the API client silently
 * refreshes on the next 401, so the presence of EITHER cookie means "don't bounce
 * to /login". Only a request with neither cookie is treated as logged-out.
 *
 * The backend still enforces real auth on every API call — this is purely the
 * client-side redirect gate.
 */
export function isSessionReachable(cookies: {
  accessToken?: string | undefined
  refreshToken?: string | undefined
}): boolean {
  return Boolean(cookies.accessToken || cookies.refreshToken)
}

/**
 * Validate a `?next=` redirect target from the URL. Only same-site absolute
 * paths pass: must start with a single `/` (rejects `//evil.com` and `/\evil`
 * protocol-relative tricks, full URLs, and anything relative). Returns null
 * when invalid so callers fall back to their default destination.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null
  return /^\/(?![/\\])/.test(raw) ? raw : null
}
