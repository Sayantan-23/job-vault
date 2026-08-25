---
id: t-0007
title: Production WebSocket upgrade proxy
status: backlog
created: 2026-06-04
updated: 2026-08-25T12:30:00Z
estimate: S
tags: [realtime, infra, deferred]
---

Front the app in production with a proxy that forwards the WebSocket `Upgrade`
handshake for `/socket.io` to backend-express — nginx
(`proxy_set_header Upgrade $http_upgrade; Connection "upgrade";`), Traefik, a
WS-aware load balancer, or a custom Next server handling the `upgrade` event.

**Why.** A WebSocket starts as an HTTP request with `Upgrade: websocket` and a
`101 Switching Protocols` response. Next's `rewrites()` proxy forwards ordinary
HTTP — including socket.io's long-polling transport — but does not reliably
forward the raw handshake, so socket.io falls back to long-polling.

**Not required for function:** real-time works today on the fallback (proven by
the live smoke). This is a production efficiency upgrade — one persistent
connection instead of repeated HTTP requests. Follows from [[d-004]].

**Verified 2026-08-25:** still open; no proxy config in the repo.
