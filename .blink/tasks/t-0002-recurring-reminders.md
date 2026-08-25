---
id: t-0002
title: Recurring reminders
status: backlog
created: 2026-06-04
updated: 2026-08-25T12:30:00Z
estimate: M
tags: [reminders, backend, deferred]
---

Reminders that re-fire on a schedule (daily / weekly / RRULE) instead of the
current one-shot model: single `remindAt`, fire once, `isCompleted = true`.

**Why.** Covers "remind me every Monday to chase open applications" and "every
3 days until they reply".

**Needs.** A recurrence rule on the reminder, next-occurrence computation, and a
sweep change so a fired recurring reminder reschedules instead of completing.

**Trigger.** Low priority — most job-tracking reminders are genuinely one-off.

**Verified 2026-08-25:** still open. `db/schema/reminders.ts` carries only
`remindAt` + `isCompleted`; the sweep runs `*/5 * * * *` in `scheduler.ts`.
