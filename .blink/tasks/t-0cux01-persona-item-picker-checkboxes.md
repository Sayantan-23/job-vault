---
id: t-0cux01
title: "Fix persona item picker checkboxes and layout on web and mobile"
status: done
milestone: m-0cc02t
owner: Antigravity
created: 2026-09-08T23:22:00Z
updated: 2026-09-08T23:28:00Z
estimate: S
tags: [mobile, web, personas, profile]
---

Fix checkbox responsiveness and layout in Persona item pickers (Experience, Projects, Skills, Education).

**Problem**
1. Checkboxes under "From your profile" in persona edit do nothing on web and mobile when profile items lack IDs (or IDs mismatch).
2. On mobile, checkboxes in `PersonaItemPicker` are not on the same line as the title due to `Pressable` being imported from `react-native` instead of `react-native-css/components`.
3. In backend, `profileService.getForUser` returns raw profile without `ensureIds`, and seed data lacks persistent item IDs.

**Done when**
- Backend `profileService.getForUser` ensures and persists stable IDs so profile items always have IDs.
- `seed-demo.ts` seeds profile and personas with shared stable IDs.
- Client helpers `ensureProfileIds` and `reconcilePersonaWithProfile` guarantee matching IDs between master profile and persona draft.
- Mobile `PersonaItemPicker` imports `Pressable` from `react-native-css/components`, placing checkboxes and text in the same horizontal row, with proper `pointerEvents="none"` on the icon container.
- Checking a profile item adds it to the persona and checks the box; unchecking removes it; Add all adds missing items.
- All tests pass on backend, frontend, and mobile.
