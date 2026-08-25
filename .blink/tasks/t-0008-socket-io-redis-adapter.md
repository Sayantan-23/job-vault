---
id: t-0008
title: socket.io Redis adapter for multi-instance
status: backlog
created: 2026-06-04
updated: 2026-08-25T12:30:00Z
estimate: S
tags: [realtime, infra, deferred]
---

Wire `@socket.io/redis-adapter` so an emit from one backend instance reaches
sockets held by another.

**Why.** In-memory rooms are per-process. This is a tripwire, not a feature: the
day a second backend instance exists, real-time silently half-works —
notifications reach only the users whose socket happens to live on the emitting
instance. Follows from [[d-004]].

**Trigger.** Before the first horizontal scale-out.

**Verified 2026-08-25:** still open; no redis dependency in
`backend-express/package.json`.
