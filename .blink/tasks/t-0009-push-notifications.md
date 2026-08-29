---
id: t-0009
title: Mobile push delivery — device tokens and Expo send
status: planned
milestone: m-0cc02t
created: 2026-06-04
updated: 2026-08-29T07:15:35Z
estimate: L
tags: [notifications, backend, mobile]
---

Deliver notifications to the mobile app with it closed. The backend half of
C6 ([[t-0ccxkq]]); the app-side registration lives there.

**Done when** there is a device-token table + migration, an endpoint the app
posts its Expo push token to, and a delivery path in the notifications service
that sends through Expo's push service. User-scoped like every other query.

**Rescoped 2026-08-29.** This task previously covered browser Push API + VAPID
*and* mobile. Those are different mechanisms; it is now mobile-only, on
[[m-0cc02t]]. **Browser push is dropped from this task and is currently
unscheduled** — open a fresh task if it is wanted.

No blockers: the token is just a string plus a platform, so this is buildable
and testable before any mobile screen exists. It runs in wave 1.

**Why.** The same gap [[t-0001]] closes by email, closed by push instead. Email
is the cheaper first move; push matters once a mobile app exists.

**Verified 2026-08-25:** still open; no `web-push` dependency, no service
worker.
