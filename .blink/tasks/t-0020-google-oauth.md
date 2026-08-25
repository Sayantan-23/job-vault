---
id: t-0020
title: Google OAuth sign-in
status: backlog
created: 2026-06-02
updated: 2026-08-25T12:30:00Z
estimate: M
tags: [auth, backend, frontend, deferred]
---

"Continue with Google" alongside email/password. The legacy NestJS stack had a
Google strategy and the rebuild deliberately shipped email/password first.

**Needs.** `GOOGLE_*` env keys validated by `env.ts`, an OAuth callback route
that mints the same cookie pair as password login (see [[d-002]]), account
linking against the existing `users.googleId` column, and the button on the
login and register pages.

**Verified 2026-08-25:** still open. `users.googleId` exists in the schema, and
nothing else in the backend or the auth pages references Google — the only other
hit is the Gemini client.
