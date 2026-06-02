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
