---
id: t-0003
title: Soft-delete and completedAt on reminders
status: backlog
created: 2026-06-04
updated: 2026-08-25T12:30:00Z
estimate: S
tags: [reminders, backend, deferred]
---

Keep deleted reminders as rows with a `deletedAt` instead of hard-deleting, and
record completion time with a `completedAt` timestamp instead of the bare
`isCompleted` boolean.

**Why.** Enables undo / trash UX and an audit trail of when things were done.

**Cost.** Every reminder query then has to filter `deletedAt IS NULL`. For a
single-user personal tracker the boolean plus hard delete is fine; this matters
more for multi-user, audit or compliance settings.

**Verified 2026-08-25:** still open. The table has neither column.
