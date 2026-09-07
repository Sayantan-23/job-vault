---
id: t-0cugqk
title: "C9.3 — Personas workspace & creation flow"
status: done
milestone: m-0cc02t
owner: Antigravity
created: 2026-09-07T23:05:00Z
updated: 2026-09-07T23:31:20Z
estimate: S
blocked_by: [t-0ccxks]
decisions: [d-0cugq2]
tags: [mobile, expo, personas]
---

Spec §4.8 and [[d-0cugq2]]. Personas list workspace and creation flow on mobile.

**Done when**
- Route `/personas` exists in `mobile/src/app/personas/index.tsx` under the root protected Stack.
- Header carries screen title, back button, and "New persona" button / SpeedDial action.
- Persona list displays cards showing:
  - Persona name
  - Summary preview
  - Pill badges showing item counts (e.g. "3 roles · 2 projects · 8 skills")
  - Updated relative timestamp
  - Edit navigation to `/personas/[id]`
  - Delete button triggering `ConfirmDialog` and calling `useDeletePersona()`.
- Cap indicator ("X / 5 role-focused backgrounds") showing when limit is reached.
- `CreatePersonaSheet`: allows entering a persona name, with option to "Build from profile"
  (seeding summary & basics from master profile) or start blank.
