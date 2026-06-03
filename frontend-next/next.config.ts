import type { NextConfig } from 'next'

// Server-side proxy target for /api/*. Uses the Docker-internal backend hostname
// when set, falling back to localhost for non-Docker local dev.
const backendUrl =
  process.env.BACKEND_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
      // socket.io uses /socket.io/* by default. This rewrite forwards those
      // requests to the backend; socket.io upgrades to WebSocket when the proxy
      // forwards the Upgrade header, otherwise it holds a long-polling
      // connection (still a real-time push, not app-level polling). next
      // start/standalone may not forward the raw WS Upgrade over a rewrite — in
      // production front the app with nginx/Traefik forwarding Upgrade. Follow-up.
      { source: '/socket.io/:path*', destination: `${backendUrl}/socket.io/:path*` },
    ]
  },
}

export default nextConfig
