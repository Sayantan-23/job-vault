---
id: t-0019
title: '"Referrer ghosted you" jobs filter'
status: backlog
created: 2026-07-16
updated: 2026-08-25T12:30:00Z
estimate: S
tags: [outreach, frontend, backend, deferred]
---

A jobs-toolbar filter for jobs whose outreach is still `NO_RESPONSE` past the
nudge threshold — the outreach analogue of the existing ghost/activity filter.

**Why.** Pulls up exactly the applications where a referral ask is hanging, to
batch the follow-ups.

**Needs.** A server-side filter param on `GET /api/jobs` derived from the
`contactsRepository.countsForJobs` join (or a stalled-outreach count), plus the
toolbar control. Small once [[t-0017]] has defined the threshold.

**Verified 2026-08-25:** still open.
