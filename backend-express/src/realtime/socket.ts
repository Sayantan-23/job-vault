import type { Server as HttpServer } from 'node:http'
import { Server, type Socket } from 'socket.io'
import { getEnv } from '@/config/env.js'
import { logger } from '@/shared/logger.js'
import { verifyToken } from '@/modules/auth/auth.tokens.js'

// socket.io's per-connection middleware signature (a thin alias so tests can
// call the handshake middleware in isolation without a live server).
type SocketNext = (err?: Error) => void

/** Hand-parse the `accessToken` value from a raw Cookie header. */
export function parseAccessTokenCookie(header: string | undefined): string | undefined {
  if (!header) return undefined
  for (const part of header.split(';')) {
    const [rawName, ...rawVal] = part.trim().split('=')
    if (rawName === 'accessToken') return rawVal.join('=')
  }
  return undefined
}

/**
 * Handshake auth: verify the access token and attach `socket.data.userId`.
 * Web passes it as the `accessToken` cookie, native as `auth: { token }` in the
 * handshake (d-0cc1x6). Runs on every new connection, so reconnects are
 * re-verified automatically.
 */
export function socketAuthMiddleware(socket: Socket, next: SocketNext): void {
  const handshakeToken: unknown = socket.handshake.auth?.['token']
  const token =
    typeof handshakeToken === 'string' && handshakeToken.length > 0
      ? handshakeToken
      : parseAccessTokenCookie(socket.handshake.headers.cookie)
  if (!token) {
    next(new Error('unauthorized'))
    return
  }
  try {
    const payload = verifyToken(token)
    socket.data.userId = payload.sub
    next()
  } catch {
    next(new Error('unauthorized'))
  }
}

// --- Singleton ------------------------------------------------------------
let io: Server | undefined

export function setIo(next: Server | undefined): void {
  io = next
}

export function getIo(): Server | undefined {
  return io
}

/**
 * Construct a socket.io server bound to the given http.Server, install the
 * cookie-auth handshake, and join each connection to its per-user room.
 * Stores the instance in the module singleton and returns it.
 */
export function createSocketServer(httpServer: HttpServer): Server {
  const env = getEnv()
  const server = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGINS, credentials: true },
  })
  server.use(socketAuthMiddleware)
  server.on('connection', (socket) => {
    const userId = socket.data.userId as string | undefined
    if (userId) {
      void socket.join(userId)
      logger.debug(
        { userId, socketId: socket.id, transport: socket.conn.transport.name },
        'socket connected',
      )
    }
  })
  setIo(server)
  return server
}

/**
 * Best-effort server→client push to all of a user's open sockets. A no-op when
 * the socket server is not running (e.g. under test, or with realtime disabled),
 * and never throws — notification persistence must not depend on delivery.
 */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(userId).emit(event, payload)
}
