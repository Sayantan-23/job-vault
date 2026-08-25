---
id: t-0017
title: Outreach follow-up nudge sweep
status: backlog
created: 2026-07-16
updated: 2026-08-25T12:30:00Z
estimate: M
tags: [outreach, backend, deferred]
---

A "no reply in 7 days" notification: surface contacts still at
`status = NO_RESPONSE` whose `reached_out_at` is older than the threshold, so
the user is reminded to chase the referral.

**Why.** The ghost meter nudges on *employer* silence; this is the equivalent
for *referrer* silence. Without it a stalled outreach is only visible if the
user opens the job.

**Needs.** A sweep on the existing `node-cron` scheduler following the
ghost-sweep pattern — `job_contacts.status` and `reached_out_at` are already
query-ready. Emit a notification (reuse `REMINDER`/`GENERAL`, or add a type),
idempotent so a still-unanswered contact is not re-notified every run.

**Trigger.** The most user-valuable of the three outreach follow-ups.

**Verified 2026-08-25:** still open. `scheduler.ts` runs the reminder sweep and
the daily ghost sweep only; nothing reads `job_contacts` on a schedule.
