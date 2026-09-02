---
id: t-0ccxkm
title: "C2 — The 16 UI primitives on our tokens"
status: done
milestone: m-0cc02t
created: 2026-08-29T07:15:35Z
updated: 2026-09-02T18:01:54Z
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


**2026-09-01 emulator note.** `/gallery` deep-link loaded on Android and the
three previously highest-risk opacity cases were sampled successfully:
`bg-primary/10`, `bg-destructive/10`, and `bg-muted/50`; the auth error pill and
Newsreader render were also confirmed by the same emulator run. The broader
visual sweep is intentionally paused at the user's request. MarkdownProse is
still the one incomplete primitive; the RN markdown dependency decision and
bottom-sheet decision remain open.


**Closed 2026-09-02T18:01:54Z.** All 16 primitives exist and render on our tokens, with a
`/gallery` route that renders every one of them. The last gap, `MarkdownProse`,
is built on `marked` ([[d-0cl8r6]]) — option 2 from its task, a deliberate
divergence from the spec's `react-native-markdown-display`. Verified on an
Android emulator: gallery deep-link loads, opacity cases render, Newsreader
confirmed. The only visual item still unsampled is the `bg-black/40` dialog/sheet
scrim, paused at the user's request.

The `@gorhom/bottom-sheet` question ([[t-0cgtgq]]) is the last open follow-up
from this wave — it is a decision, not a missing primitive.
