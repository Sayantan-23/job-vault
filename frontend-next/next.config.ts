import type { NextConfig } from 'next'

const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiBase}/api/:path*` }]
  },
}

export default nextConfig
