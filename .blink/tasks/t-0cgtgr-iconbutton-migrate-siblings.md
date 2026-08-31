---
id: t-0cgtgr
title: "app-header and fab hand-roll the circular icon pressable IconButton now owns"
status: backlog
milestone: m-0cc02t
created: 2026-08-31T08:41:55Z
updated: 2026-08-31T08:41:55Z
estimate: XS
blocked_by: [t-0ccxkm]
tags: [mobile, ui, tech-debt]
---

C2 ([[t-0ccxkm]]) landed `mobile/src/components/ui/icon-button.tsx`. Two files
written in C0 already hand-roll the same circular-icon-pressable shape:

- `mobile/src/components/app-header.tsx`
- `mobile/src/components/fab.tsx`

The C2 lane did not migrate them — both are outside `components/ui/`, which was
another lane's territory during the wave.

This is `CLAUDE.md`'s named recurring defect ("a new page hand-rolls a pattern a
sibling already implements, slightly differently"), and it is currently at two
copies. The rule is that the *existing pattern* wins, and `IconButton` is now it.

Note the API: `IconButton` takes `icon: LucideIcon`, **not** an icon element as
`children` — React Native has no colour inheritance into an SVG, so the component
has to own the icon to colour it.

**Done when** both files render their icon buttons through `IconButton`, no
circular-pressable styling is left duplicated in either, and the FAB still clears
the tab bar per [[d-0cd3wr]] (`FAB_SIZE` / `FAB_GAP` / `TAB_BAR_HEIGHT` in
`mobile/src/theme.ts`). Verify on device — this is visual.
