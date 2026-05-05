import { NextResponse, type NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const accessToken = req.cookies.get('accessToken')?.value
  if (!accessToken) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/app/:path*'],
}
