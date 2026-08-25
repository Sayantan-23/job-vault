# Deferred Tasks — moved to the Blink tracker

This file used to hold the deferred backlog: email reminders, recurring
reminders, extra notification types, the unread-count endpoint, retention, the
production WS-upgrade proxy, the socket.io Redis adapter, push, async scrape,
the scrape robustness nice-to-haves, the Chrome-extension follow-ups and the
Slice 9 referral-outreach follow-ups.

**Every one of them is now a task file in `.blink/tasks/`**, keeping its
original Why / Needs / Trigger prose and gaining a line recording whether the
code still matches the claim. Moved 2026-08-25.

- Browse them with `blink validate` clean and the files in `.blink/tasks/`
  (all `status: backlog`).
- The three by-design tradeoffs that lived at the bottom of
  `docs/polish-and-tech-debt.md` are risks: `.blink/risks/`.
- What shipped is still `progress.md`.

Two things changed in the move, both verified against the code rather than the
notes: the global cross-job activity feed listed here as DONE is confirmed done
(`/app/timeline` exists), and the Status/Date funnel menus recorded as not
auto-closing **do** auto-close now (`jobs-filter-menu.tsx:66,74`).

The old content is in git history.
