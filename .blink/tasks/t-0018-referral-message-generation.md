---
id: t-0018
title: AI referral email / message generation
status: backlog
created: 2026-07-16
updated: 2026-08-25T12:30:00Z
estimate: L
tags: [outreach, ai, deferred]
---

Generate the referral outreach message with AI, alongside résumé and
cover-letter generation.

**Why.** Writing "would you be open to referring me?" is the same drudgery
cover-letter generation already removes, and the contact plus its job give the
model everything it needs to tailor it.

**Needs.** A prompt builder and generator mirroring `buildCoverLetterPrompt`,
metered against the shared hourly AI budget (see [[r-002]]), and a generated
message row referencing a `contact_id` the way `cover_letters.job_id` references
a job. Editor, PDF and copy can reuse the cover-letter markdown machinery.

**Trigger.** Once the core outreach loop is in daily use and hand-drafting is
the friction.

**Verified 2026-08-25:** still open.
