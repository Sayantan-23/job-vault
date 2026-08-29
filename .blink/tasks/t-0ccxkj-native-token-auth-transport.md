---
id: t-0ccxkj
title: "Native token auth transport on the backend"
status: done
milestone: m-0cc02t
created: 2026-08-29T07:15:35Z
updated: 2026-08-29T09:40:00Z
estimate: M
decisions: [d-0cc1x6]
tags: [backend, auth, mobile]
---

Teach the existing auth module to serve a native client, without weakening the
web cookie model. Spec §3.2 and §5.1. **Gates C1 and therefore every mobile
data screen** — but touches only `backend-express/`, so it runs in parallel
with C0.

**Done when**
- `POST /api/auth/login|register|refresh` return the token pair **in the response
  body** when the caller is native, and keep setting HTTP-only cookies for the web.
- The native mode is selected **by input source, not by a request header**
  ([[d-0cc1x6]]): refresh reads its token from the request *body* for native and
  from the *cookie* for web. A header-gated mode would mean an XSS-readable
  refresh token on the web — that is the whole point of the decision.
- `authMiddleware` accepts `Authorization: Bearer <token>` **in addition to** the
  `accessToken` cookie. It reads the cookie only today
  (`src/middleware/auth.middleware.ts`).
- The socket.io handshake accepts a token: `socket.handshake.auth.token` as well
  as the cookie. Today `src/realtime/socket.ts:26` parses the cookie header only,
  and the failure mode is realtime silently never connecting while every REST
  call works.
- Same JWT service, same rotation, same reuse-detection. No new tables.
- Tests alongside the existing `auth.*.test.ts` and `socket.test.ts`.

`make test-backend` green.

---
*Cold-start: read `docs/superpowers/specs/2026-08-28-mobile-app-expo-scope.md` §8 first — it is written to be read with no other
context. Repo root is `git rev-parse --show-toplevel` (this repo is worked on
from two machines; never hardcode a home path).*
