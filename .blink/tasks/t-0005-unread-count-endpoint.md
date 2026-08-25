---
id: t-0005
title: GET /api/notifications/unread-count endpoint
status: backlog
created: 2026-06-04
updated: 2026-08-25T12:30:00Z
estimate: S
tags: [notifications, backend, deferred]
---

A dedicated cheap unread-count endpoint. Unread is currently derived
client-side from the fetched list.

**Why.** Cheaper at scale — refresh a badge count without fetching the list. The
legacy Nest service had the method; the rebuild just never exposed it.

**Trigger.** Only if the notification list grows large enough that fetching it
for a badge count is wasteful.

**Verified 2026-08-25:** still open. The router exposes list / mark-read /
mark-all-read only; `unreadOnly` is a query flag on the list.
