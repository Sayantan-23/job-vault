import { io, type Socket } from 'socket.io-client';

import { API_BASE } from './api-base';
import { authStore } from './auth-store';

// Two things differ from frontend-next/src/lib/socket.ts, and only one of them
// is the documented trap. The web passes `undefined` as the URL to connect to
// the page origin, which natively is no origin at all — so the absolute base is
// required. And socket.io authenticates on the upgrade request from the cookie,
// which a native client does not have: the access token rides in the handshake
// `auth` payload instead (d-0cc1x6). Miss either and realtime silently never
// connects while every REST call keeps working.
let socket: Socket | undefined;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE, {
      path: '/socket.io',
      autoConnect: false,
      transports: ['websocket', 'polling'],
      // A callback rather than a literal: it runs on every (re)connect, so a
      // reconnect after the access token rotated sends the current one.
      auth: (cb) => {
        void authStore.getAccessToken().then((token) => cb({ token: token ?? '' }));
      },
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  s.connect();
  return s;
}

export function disconnectSocket(): void {
  socket?.disconnect();
}
