---
id: d-0cc01s
title: React Native + Expo for the mobile app, not Flutter
status: accepted
date: 2026-08-28
created: 2026-08-28T00:00:00Z
updated: 2026-08-28T00:00:00Z
tags: [mobile, architecture]
---

## Context

A mobile app has been implied by the backlog for months without ever being
decided: [[t-0009]] defers push notifications with "push matters once a mobile
app exists". Twelve stock `flutter-*`/`dart-*` skills sat in `.claude/skills/`
as the only trace of an intent to build it in Flutter. No Dart code, no
`pubspec.yaml`, no spec, no milestone — the sunk cost was exactly zero.

The trigger to revisit was a read that "Flutter is declining in the community."
That read does not survive checking: Google published a 2026 roadmap in
February, Flutter 3.44 / Dart 3.12 shipped at I/O 2026, Impeller is completing
on Android, and the widely-quoted "46% vs 35% market share" figure is a 2023
Statista multi-select survey relabelled as current data. Flutter is healthy.
It is simply the wrong tool *here*.

## Options

1. **Flutter** — pixel-identical rendering, strongest animation story, deeper
   local (India) community. Costs a full Dart reimplementation of every type,
   schema and data hook, and permanently forks the API contract into two
   hand-maintained copies.
2. **React Native + Expo** — reuses the language, the type system, the data
   layer and the developer. Costs a rewrite of the view layer only, plus four
   named web-only dependencies.
3. **Kotlin Multiplatform** — the genuinely rising third option (7% → 18% in a
   year), but it shares business logic with *native* UI and assumes Kotlin
   fluency this project does not have.

## Decision

**React Native + Expo.** The deciding argument is code and mental-model reuse
against this specific codebase, not framework popularity.

`frontend-next/src/hooks/` is 25 TanStack Query hooks over `lib/api-client.ts`.
Those hooks, the Zod schemas, the shared types, `cover-letter-markdown.ts`, the
résumé `.tex` deriver and `socket.io-client` are all platform-agnostic and run
under React Native unchanged. Flutter reimplements every one of them in Dart.

Two secondary factors confirmed it rather than drove it:

- **The app is not animation-heavy.** The search-palette morph, sheet
  transitions and the ghost meter are measured layout transitions, well within
  Reanimated. Flutter's rendering advantage buys a CRUD/list/kanban app nothing.
- **Existing Flutter knowledge is stale.** Half-remembered Dart is worth close
  to nothing against fluent React; the "I already know some Flutter" argument
  evaluated to zero on inspection.

Expo specifically, not bare React Native: the State of React Native 2026 survey
(3,501 responses) puts Expo Router at 71% and EAS Build in the lead, and Expo
is now the officially recommended way to start. The "eject when you get
serious" era is over.

## Consequences

- The twelve `flutter-*`/`dart-*` skills are deleted. Recoverable from git
  history if this is ever revisited.
- Four web-only dependencies have no native equivalent and must be replaced,
  not ported: `motion` → Reanimated, `@dnd-kit` → gesture-handler,
  `@react-pdf/renderer` → `expo-print`, `react-markdown` →
  `react-native-markdown-display`. Radix (dialog/popover) becomes RN `Modal` /
  a bottom-sheet library.
- HTTP-only cookies ([[d-002]]) do not work in a native client. A native token
  transport is required — see the auth decision owed under [[m-02]]. The
  `X-API-Key` path built for the extension is precedent that the backend can
  carry a second auth mode, but extension keys are long-lived and unrotated and
  are **not** the right fit for a user session.
- [[d-003]] (no file storage, derive documents in code) constrains the mobile
  PDF story: `expo-print` renders on-device from HTML, keeping the no-storage
  rule intact.
- Whether the shared layer becomes a real workspace package or is duplicated is
  deliberately left open for [[m-02]] to settle.
