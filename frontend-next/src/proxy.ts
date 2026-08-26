import { NextResponse, type NextRequest } from 'next/server'
import { isSessionReachable, safeNextPath } from '@/lib/auth-gate'
import { extractCookieValues, mergeCookieHeader } from '@/lib/middleware-cookies'

// Server-side proxy target, same as next.config rewrites + api-server.ts. The
// browser never uses this; the proxy runs inside the Next server process.
const BACKEND_URL =
  process.env['BACKEND_INTERNAL_URL'] ?? process.env['NEXT_PUBLIC_API_BASE'] ?? 'http://localhost:3000'

// Next prefetches /app links on hover/viewport. Rotating the refresh token on
// those would fire many concurrent rotations and risk tripping the backend's
// reuse-detection (logging the user out). Only genuine navigations and full
// document loads rotate; prefetches fall through and render with what they have
// (the real navigation that follows them rotates).
function isPrefetch(req: NextRequest): boolean {
  return (
    req.headers.get('next-router-prefetch') !== null ||
    req.headers.get('purpose') === 'prefetch' ||
    req.headers.get('x-purpose') === 'prefetch'
  )
}

// Logged-out /app/* requests bounce to /login carrying the original URL in
// ?next=, so login/register can land the user back where they were headed.
function loginRedirect(req: NextRequest): NextResponse {
  const next = req.nextUrl.pathname + req.nextUrl.search
  return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, req.url))
}

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const accessToken = req.cookies.get('accessToken')?.value
  const refreshToken = req.cookies.get('refreshToken')?.value
  const reachable = isSessionReachable({ accessToken, refreshToken })

  // /login and /register are pointless for a logged-in user -> send them to
  // the app (or wherever ?next= was pointing).
  const { pathname } = req.nextUrl
  if (pathname === '/login' || pathname === '/register') {
    if (!reachable) return NextResponse.next()
    const next = safeNextPath(req.nextUrl.searchParams.get('next'))
    return NextResponse.redirect(new URL(next ?? '/app/jobs', req.url))
  }

  // Neither cookie -> genuinely logged out.
  if (!reachable) {
    return loginRedirect(req)
  }

  // A live access-token cookie means an unexpired token (its maxAge equals the
  // 15m JWT lifetime, so its mere presence implies it is still valid). Nothing to
  // refresh with, or a prefetch -> let the request through untouched.
  if (accessToken || !refreshToken || isPrefetch(req)) {
    return NextResponse.next()
  }

  // Access token expired/gone but the refresh token survives. Rotate it HERE,
  // before the server render, so Server Components fetch with a valid token
  // instead of getting a 401 and falling back to empty data. Without this the
  // first post-idle refresh/navigation renders blank and only a second load
  // recovers (the client's silent-refresh having quietly fixed the cookies).
  let setCookies: string[] = []
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { cookie: `refreshToken=${refreshToken}`, accept: 'application/json' },
    })
    if (res.ok) {
      setCookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : []
    } else if (res.status === 401) {
      // The refresh token is revoked/expired -> the session is unrecoverable.
      const redirect = loginRedirect(req)
      redirect.cookies.delete('accessToken')
      redirect.cookies.delete('refreshToken')
      return redirect
    }
    // Any other status (5xx, etc.): fall through without rotating; the client's
    // own silent-refresh remains a safety net.
  } catch {
    // Backend unreachable: don't punish the user with a logout; fall through.
  }

  if (setCookies.length === 0) return NextResponse.next()

  const rotated = extractCookieValues(setCookies, ['accessToken', 'refreshToken'])

  // Hand the freshly-minted access token to the downstream server render so its
  // api-server fetch forwards a valid token...
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('cookie', mergeCookieHeader(req.headers.get('cookie'), rotated))
  const response = NextResponse.next({ request: { headers: requestHeaders } })

  // ...and replay the rotated pair to the browser so subsequent client requests
  // (and the next navigation) use the new cookies too.
  for (const cookie of setCookies) response.headers.append('set-cookie', cookie)
  return response
}

export const config = {
  matcher: ['/app/:path*', '/login', '/register'],
}
