---
id: t-0ccxks
title: "C9.1 — Profile & personas data layer (types, validation, queries & mutations)"
status: done
milestone: m-0cc02t
owner: Antigravity
created: 2026-08-29T07:15:35Z
updated: 2026-09-07T23:22:20Z
estimate: S
blocked_by: [t-0ccxkl, t-0ccxkm]
decisions: [d-0cugq2]
tags: [mobile, expo, profile, personas]
---

Spec §4.8 and [[d-0cugq2]]. Foundation data layer for native profile and persona
management on mobile.

**Done when**
- `ProfileContent`, `ProfileBasics`, `ProfileExperience`, `ProfileProject`,
  `ProfileSkillGroup`, `ProfileEducation`, and `MonthYear` types ported to
  `mobile/src/types/profile.ts`.
- `mobile/src/types/persona.ts` updated so `data` is typed as `ProfileContent`.
- Validation and helper functions (`emptyProfileContent`, `validateProfileContent`,
  `formatMonthYearRange`, `formatMonthYear`) ported and tested in `mobile/src/lib/profile.ts`.
- `useProfile()` and `useUpdateProfile()` hooks implemented in `mobile/src/hooks/use-profile.ts`
  backed by `GET /api/profile` and `PUT /api/profile`.
- `usePersonas()`, `usePersona(id)`, `useCreatePersona()`, `useUpdatePersona(id)`,
  and `useDeletePersona()` implemented in `mobile/src/hooks/use-personas.ts`.
- Unit tests cover all ported helpers, queries, and mutations.
