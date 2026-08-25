---
id: t-0001
title: Email delivery for reminders and notifications
status: backlog
created: 2026-06-04
updated: 2026-08-25T12:30:00Z
estimate: M
tags: [notifications, backend, deferred]
---

When a reminder comes due — or any notification is created — also deliver it by
email, not just in-app (DB row + socket.io push).

**Why.** In-app notifications only reach the user while the app is open. A job
seeker is not staring at the app at the moment a follow-up is due, so email is
how a reminder actually arrives. The most user-valuable deferred item.

**Needs.**
- An email provider wired through env (Resend / SendGrid / SES / SMTP) as a new
  optional key validated by `env.ts`.
- A small templating layer for the REMINDER and GHOST_ALERT emails.
- User-level prefs (opt in/out, immediate vs daily digest) — likely on
  `users.preferences`.
- A hook in `notificationService.create` and/or the reminder sweep. Keep it
  best-effort and async so an email failure never blocks the in-app
  notification — the same seam shape as the best-effort socket `emitToUser`
  (see [[d-004]]).

**Verified 2026-08-25:** still open. No mail dependency or SMTP config anywhere
in `backend-express` — the scheduler's reminder sweep writes a row and emits.
