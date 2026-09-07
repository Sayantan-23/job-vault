---
id: d-0cugq2
title: Native Profile and Persona editing on mobile
status: accepted
date: 2026-09-07
created: 2026-09-07T23:05:00Z
updated: 2026-09-07T23:05:00Z
tags: [mobile, profile, personas, spec]
---

## Context

The initial mobile app scope spec (`docs/superpowers/specs/2026-08-28-mobile-app-expo-scope.md` §4.8) classified Profile and Personas as "T3 read-only", intending for mobile to provide only a read-only overview and deep-link out to the web app for all editing. This was originally rationalized by the line count of web's editors (Profile ~881 LOC, Personas ~959 LOC).

However, managing one's master profile details and switching or tuning role-specific personas on the go is a core user flow on mobile. Linking out to an external web browser degrades the native app experience and breaks user momentum when tailoring applications or updating experience on device.

## Decision

Re-scope Chunk C9 to build native, touch-first editing for both the Master Profile and Personas on mobile:

1. **Master Profile Screen (`/profile`):**
   - Full-screen root route navigated from the header avatar (`AccountMenu`).
   - Touch-adapted form layout: collapsible accordion sections for Basics, Summary, Experience, Projects, Skills, and Education.
   - Structured sub-items (Experience roles, Projects, Education degrees) edited via bottom modal sheets to keep the main view clean and thumb-friendly.
   - Saves directly to existing backend `PUT /api/profile` with validation matching web.

2. **Personas Workspace (`/personas` & `/personas/[id]`):**
   - Personas list screen displaying cards with role variant badges, summary snippet, attached item counts, and quick actions (edit, delete with `ConfirmDialog`).
   - Create Persona sheet: name input, option to seed from Master Profile.
   - Persona Editor: tailored summary and mobile-adapted `PersonaItemPicker` to select/toggle and customize items from the Master Profile.
   - Saves to backend `POST /api/personas`, `PATCH /api/personas/:id`, and `DELETE /api/personas/:id`.

3. **Carve-out (Still out of scope on mobile):**
   - PDF résumé upload/import into personas (`POST /api/personas/parse-resume`) remains web/desktop-only.

## Consequences

- Task `t-0ccxks` is broken into focused subtasks covering data types/hooks, master profile screens, personas workspace, persona editor, and navigation integration.
- Navigation in `AccountMenu` adds real destinations for "Profile" and "Personas".
- Reuses existing backend contracts (`/api/profile` and `/api/personas`) without backend modifications.
