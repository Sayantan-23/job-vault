---
id: t-0cugqm
title: "C9.5 — Navigation wiring (AccountMenu) & test verification"
status: done
milestone: m-0cc02t
owner: Antigravity
created: 2026-09-07T23:05:00Z
updated: 2026-09-07T23:35:45Z
estimate: XS
blocked_by: [t-0cugql]
decisions: [d-0cugq2]
tags: [mobile, expo, profile, personas]
---

Spec §4.8 and [[d-0cugq2]]. Entry points and verification for C9.

**Done when**
- `mobile/src/components/account-menu.tsx` includes navigable links for:
  - "Profile" (User icon) navigating to `/profile`
  - "Personas" (Users/Layers icon) navigating to `/personas`
- Back navigation returns cleanly to previous screens.
- Comprehensive test coverage for:
  - Profile and persona hooks (`use-profile.test.tsx`, `use-personas.test.tsx`)
  - Profile workspace and section editors
  - Personas workspace, creation sheet, and persona editor
  - AccountMenu navigation
- `npm run typecheck`, `npm run lint`, and `npm test` pass cleanly in `mobile/`.
