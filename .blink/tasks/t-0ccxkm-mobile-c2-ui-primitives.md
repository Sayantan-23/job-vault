---
id: t-0ccxkm
title: "C2 — The 16 UI primitives on our tokens"
status: planned
milestone: m-0cc02t
created: 2026-08-29T07:15:35Z
updated: 2026-08-29T07:15:35Z
estimate: L
blocked_by: [t-0ccxkk]
decisions: [d-006, d-0cc24z]
tags: [mobile, expo, ui]
---

Spec §2 "The 16 UI primitives" and §2.1. Runs parallel with C1.

Re-implementation, **not** a migration: `frontend-next/src/components/ui/` is
hand-written on our own tokens ([[d-006]]), so the API surface and token names
carry over verbatim while the markup is rebuilt. Each primitive is small.

**The split** ([[d-0cc24z]]): the OS owns momentary system interruptions — date
pickers, action and share sheets, context menus, alerts, haptics — via
`@expo/ui`. **We** own the content the user came for: job rows, answer cards,
buttons, chips, status pills, headers, empty states, the FAB.

**Done when** the 16 primitives render in light and dark on our tokens, and a
screen built from them reads as JobVault rather than as an OS settings pane.

**Traps.** `@expo/ui` `List` is **not** virtualized — it renders native grouped
rows; jobs and answers use `FlatList`/`FlashList` regardless.
`@gorhom/bottom-sheet` needs `GestureHandlerRootView` at the root and an
explicit background style, or it renders invisible.

Skills: `expo-design-system`, `expo-ui`, `expo-native-ui`.

---
*Cold-start: read `docs/superpowers/specs/2026-08-28-mobile-app-expo-scope.md` §8 first — it is written to be read with no other
context. Repo root is `git rev-parse --show-toplevel` (this repo is worked on
from two machines; never hardcode a home path).*
