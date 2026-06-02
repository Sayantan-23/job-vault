import { NextResponse, type NextRequest } from 'next/server'
import { isSessionReachable } from '@/lib/auth-gate'

export function middleware(req: NextRequest) {
  const reachable = isSessionReachable({
    accessToken: req.cookies.get('accessToken')?.value,
    refreshToken: req.cookies.get('refreshToken')?.value,
  })
  if (reachable) return NextResponse.next()

  const loginUrl = new URL('/login', req.url)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/app/:path*'],
}
