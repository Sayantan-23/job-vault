import type { NextConfig } from 'next'

// Server-side proxy target for /api/*. Uses the Docker-internal backend hostname
// when set, falling back to localhost for non-Docker local dev.
const backendUrl =
  process.env.BACKEND_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backendUrl}/api/:path*` }]
  },
}

export default nextConfig
