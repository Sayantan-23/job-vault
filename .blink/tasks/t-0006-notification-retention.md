---
id: t-0006
title: Notification retention / auto-archive
status: backlog
created: 2026-06-04
updated: 2026-08-25T12:30:00Z
estimate: S
tags: [notifications, backend, deferred]
---

A policy that prunes or archives old notifications. The list read is capped at
50, but nothing trims the table.

**Why.** Keeps the table bounded over a long-lived account. Housekeeping, not
urgent.

**Verified 2026-08-25:** still open. No prune or retention job exists; the
scheduler runs exactly two crons (reminder sweep, daily ghost sweep).
