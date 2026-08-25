---
id: d-002
title: JWT in HTTP-only cookies with silent refresh, not Bearer-in-body
status: accepted
date: 2026-06-02
updated: 2026-08-25T12:30:00Z
tags: [auth, backend, frontend]
---

## Context
The NestJS original returned access/refresh tokens in the response body and the
Nuxt client attached a Bearer header. The Express/Next rebuild had to pick an
auth transport before Slice 1.

## Options
- **Bearer in body + client storage** — parity with the old stack, but the token
  is reachable from JavaScript (XSS) and the Next middleware cannot see it, so
  route gating has to happen client-side after hydration.
- **HTTP-only cookies** — unreachable from JS, sent automatically on same-origin
  `/api/*` calls (which Next already proxies), and readable by `middleware.ts`.

## Decision
Access token 15m, refresh token 7d, both HTTP-only cookies at `path:/`, with
refresh rotation. `lib/api-client.ts` retries a 401 through
`/api/auth/refresh` once and replays the request (single-flight);
`middleware.ts` gates `/app/*` on the presence of either cookie.

## Consequences
The Chrome extension cannot ride the cookie — it authenticates with an
`X-API-Key` header instead (see [[d-006]] area, `api_keys` module), and only the
same-origin key mint uses the cookie. Cookies were deliberately not weakened
(no `SameSite=None`) to accommodate it.
