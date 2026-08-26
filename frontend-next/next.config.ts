import type { NextConfig } from 'next'

// Server-side proxy target for /api/*. Uses the Docker-internal backend hostname
// when set, falling back to localhost for non-Docker local dev.
const backendUrl =
  process.env.BACKEND_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // The /api rewrite proxy aborts slow upstream responses after 30s by default,
  // returning a bare text 500 to the browser. AI endpoints (parse-resume,
  // résumé/cover-letter generation) can legitimately exceed that — give them
  // room; the backend's own Gemini timeout (60s) still bounds the wait.
  experimental: { proxyTimeout: 180_000 },
  // socket.io-client connects to `/socket.io/` (with a trailing slash). With the
  // default trailing-slash handling, Next 308-redirects `/socket.io/?EIO=4…` to
  // `/socket.io?EIO=4…`, which breaks the engine.io handshake before the rewrite
  // can forward it. Skipping the redirect lets the `/socket.io/:path*` rewrite
  // match the bare `/socket.io/` handshake path and proxy it to the backend.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
      // socket.io's engine.io handshake always hits `/socket.io/` (trailing slash)
      // with query params. This exact-match entry comes first and preserves the
      // trailing slash — the `:path*` form below collapses the empty segment to
      // `/socket.io` (no slash), which socket.io does not intercept (Express 404s).
      // socket.io upgrades to WebSocket when the proxy forwards the Upgrade header,
      // otherwise it holds a long-polling connection (still a real-time push, not
      // app-level polling). next start/standalone may not forward the raw WS
      // Upgrade over a rewrite — in production front the app with nginx/Traefik
      // forwarding Upgrade. Follow-up.
      { source: '/socket.io/', destination: `${backendUrl}/socket.io/` },
      { source: '/socket.io/:path*', destination: `${backendUrl}/socket.io/:path*` },
    ]
  },
}

export default nextConfig
