import { io, type Socket } from 'socket.io-client'

// A single same-origin socket shared across the app. An `undefined` URL connects
// to the page origin; the Next rewrite forwards `/socket.io/*` to the backend.
// socket.io negotiates the best available transport: a real WebSocket upgrade if
// the proxy forwards the Upgrade header, otherwise it holds a long-polling
// connection. Both deliver pushes promptly — neither is the app-level polling we
// removed. (See next.config.ts for the upgrade-forwarding caveat behind Docker.)
let socket: Socket | undefined

export function getSocket(): Socket {
  if (!socket) {
    socket = io(undefined, {
      path: '/socket.io',
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}

export function connectSocket(): Socket {
  const s = getSocket()
  s.connect()
  return s
}

export function disconnectSocket(): void {
  socket?.disconnect()
}
