---
id: d-0cc24z
title: Native chrome for system moments, our tokens for content — on NativeWind
status: accepted
date: 2026-08-29
created: 2026-08-29T00:00:00Z
updated: 2026-08-29T00:00:00Z
tags: [mobile, design-system]
---

## Context

Expo's own guidance (`expo-overview`, `expo-web-to-native`) says reach for
`@expo/ui` first: real SwiftUI and Jetpack Compose, so screens feel exactly like
the OS shipped them. JobVault's identity is deliberately **not** OS-native —
warm stone, flat muted indigo, Instrument Serif headings, hairline borders,
near-zero shadows ([[d-006]]). An `@expo/ui` `List` renders as an iOS Settings
screen.

Framed as "native feel vs brand identity" this looks like a hard trade. It is
not, because "native feel" is three separable things and only one of them
touches styling:

1. **Physics and input** — `ScrollView`, `FlatList` and `TextInput` *are* native
   views. Momentum, rubber-banding, keyboard avoidance, the selection magnifier,
   gesture velocity. Free, and indifferent to styling.
2. **Navigation transitions** — Expo Router's native Stack on
   `react-native-screens` gives real `UINavigationController` push/pop and
   Android fragment transitions. Native container, our content inside.
3. **Widget chrome** — the *look* of date pickers, switches, menus, action
   sheets. The only real collision.

## Decision

**Split by role.** The OS owns momentary system interruptions; we own the
content the user came for.

| Layer | Owner |
|---|---|
| Date/time pickers, action + share sheets, context menus, alerts, permission dialogs, haptics | `@expo/ui` / platform |
| Bottom sheets | `@gorhom/bottom-sheet` — native physics, branded chrome |
| Job rows, answer cards, job detail, buttons, chips, status pills, headers, empty states, the FAB and its morph | our tokens |

The test: **a momentary system interruption belongs to the OS; the content the
user came for belongs to us.** Google Keep is the reference — FAB, cards and
typography are pure brand; the share sheet and keyboard are pure Android.

`@gorhom/bottom-sheet` over `@expo/ui` `BottomSheet` is deliberate and is *not*
a departure from the "`@expo/ui` first" rule — that rule's stated exception is RN
primitives for custom layouts. `@expo/ui`'s sheet is a real
`UISheetPresentationController`, which slides; it cannot morph out of a button,
so it is incompatible with the agreed FAB container transform. gorhom keeps the
UI-thread gesture physics and velocity snapping while leaving the chrome ours.

**Styling layer: NativeWind.** Tokens stay CSS variables under the same names as
`frontend-next/src/styles/`, so the web design system carries over as-is and dark
mode works by the same mechanism. Unistyles 3 is measurably faster and ships no
components (philosophically closer to [[d-006]]), but it cannot run in Expo Go,
requires a dev build, and would introduce a second styling idiom across the two
clients. Circulating benchmarks favouring it are vendor-published by a
competitor's authors and measure style resolution, not app performance.

## Consequences

- Chunk C2 (UI primitives) shrinks: pickers, menus and action sheets are not
  rebuilt, only wrapped.
- `@expo/ui`'s platform layer (`@expo/ui/swift-ui`, `/jetpack-compose`) exposes
  SwiftUI/Compose modifiers, so a native component *can* be styled further — at
  the cost of `.ios.tsx`/`.android.tsx` twin trees. Worth it for a picker, never
  for a content surface.
- `@expo/ui` `List` is not virtualized. Jobs and answers use `FlatList`/`FlashList`
  regardless of this decision.
- Any future component sitting ambiguously across the line gets decided against
  the test above, once, rather than per-screen by whoever is writing it.

## Amendment 2026-09-02 — bottom sheets are ours, not @gorhom's

Section "Decision" above assigns bottom sheets to `@gorhom/bottom-sheet` for
"native physics, branded chrome." After building and using the Modal-based
`Sheet`, that assignment is **amended**: bottom sheets are **ours**, built on
React Native's `Modal`, the same way buttons and headers are ours.

**Why:** The app's identity is deliberately non-OS-native
([[d-006]], warm-stone canvas, flat muted indigo, serif headings). A bottom sheet
that slides up from the bottom of the screen with our own grab handle, our own
border radius, our own surface token, and our own slide animation **is** branded
chrome — it reads as JobVault, not as an iOS sheet. `@gorhom/bottom-sheet`
exists to add native gesture physics (snap points, velocity drag-dismiss) on
top of content; those are refinements, not the identity the sheet carries.

**What the Modal version gets right:** correct bottom-up entrance, native
`animationType="slide"`, Android back-button wired to close, grab handle,
`GestureHandlerRootView` already at the root if gesture support is added later.

**What it does not have (accepted):** snap points, velocity dismiss,
drag-to-close. No current caller needs them — C3's filter sheet and C4's
answer sheet are single-height panels. If a future caller needs snap points
(e.g. a half-sheet that collapses to a peek), `@gorhom/bottom-sheet` can be
installed then, with `Sheet` upgraded behind the same API. The trap is already
paid for: `GestureHandlerRootView` is at the root.

**`@expo/ui` `BottomSheet`** was considered and rejected in the original
decision (it is a `UISheetPresentationController`, cannot morph). This
amendment does not revisit that — it moves the sheet from "gorhom" to "ours"
in the ownership table.
