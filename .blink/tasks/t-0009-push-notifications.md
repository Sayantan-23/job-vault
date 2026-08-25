---
id: t-0009
title: Web / mobile push notifications
status: backlog
created: 2026-06-04
updated: 2026-08-25T12:30:00Z
estimate: L
tags: [notifications, deferred]
---

Deliver notifications through the browser Push API (service worker + VAPID) or
a mobile push channel, so they arrive with the app closed.

**Why.** The same gap [[t-0001]] closes by email, closed by push instead. Email
is the cheaper first move; push matters once a mobile app exists.

**Verified 2026-08-25:** still open; no `web-push` dependency, no service
worker.
