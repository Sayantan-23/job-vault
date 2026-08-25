---
id: t-0004
title: Emit STATUS_CHANGE and GENERAL notifications
status: backlog
created: 2026-06-04
updated: 2026-08-25T12:30:00Z
estimate: S
tags: [notifications, backend, deferred]
---

Actually create notifications of these two types. The enum values exist for
legacy parity but only `REMINDER` and `GHOST_ALERT` are emitted by the app.

**Why.** A `STATUS_CHANGE` notification when a job moves columns, for example.
The groundwork is laid, so it is purely additive. Note the actor already sees
their own move in the UI, so the real value is cross-device sync.

**Verified 2026-08-25:** still open, with a wrinkle — `NOTIFICATION_TYPES`
includes both, and `scripts/seed-demo.ts` writes STATUS_CHANGE and GENERAL rows,
so the demo workspace shows notification types the running app never produces.
