---
id: d-0cc1x6
title: Native clients authenticate with keychain-stored tokens, not cookies
status: accepted
date: 2026-08-29
created: 2026-08-29T00:00:00Z
updated: 2026-08-29T00:00:00Z
tags: [mobile, auth, security]
---

## Context

The web app authenticates with two HTTP-only cookies ([[d-002]]) and a
single-flight silent refresh in `lib/api-client.ts`. React Native has a native
cookie store, so cookies half-work on mobile — which is worse than not working:
the store is opaque (`HttpOnly` means the client cannot tell whether it is
logged in without making a request), Android has known persistence bugs across
app restarts, and there is no `credentials: 'include'` parity.

The deeper point is that HttpOnly cookies exist to defend against XSS in a
browser. A native app has no DOM and no XSS. The threat model is different and
the correct primitive is the OS keychain.

## Decision

Native clients receive the token pair in the response body and store it in
`expo-secure-store` (iOS Keychain / Android EncryptedSharedPreferences —
**never** `AsyncStorage`, which is plaintext on disk). Requests carry
`Authorization: Bearer`. The web keeps cookies exactly as they are.

Refresh rotation and reuse-detection are untouched and apply to both transports.

**The native mode is selected by input source, not by a header.** Native refresh
takes the refresh token in the request body; cookie refresh reads the cookie.

This detail is the whole security argument. Gating on a header such as
`X-Client: native` would let an XSS on the web app call
`POST /api/auth/refresh` with that header and read the refresh token out of the
response body — a token that is otherwise HttpOnly and unreadable. That is a
straight privilege escalation handed over by the feature. A browser client does
not possess the refresh token to put in a body, so the input-source gate closes
it with no extra check.

## Consequences

- `authMiddleware` reads the `accessToken` cookie today; it must also accept
  `Authorization: Bearer`. One place.
- **socket.io authenticates on the upgrade request via cookie.** Native must
  pass `auth: { token }` in the handshake. Easy to miss — the failure mode is
  realtime silently never connecting while every REST call works.
- Logout must clear secure-store *and* call the endpoint, so the refresh token
  is revoked server-side rather than merely forgotten.
- `api-client` needs an injectable token provider so the same module serves
  both transports. This is the first thing forcing the shared-layer question.
- Consider a longer refresh window for native (30d vs the web's 7d): being
  logged out of a phone app weekly is a real retention problem.
- `expo-local-authentication` (biometric lock) is a natural later addition.
