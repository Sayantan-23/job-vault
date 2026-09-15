---
id: d-0cdegb
title: "Mobile dark mode: Option B (pitch black tab bar, borderless, page curved over tab bar)"
status: accepted
date: 2026-09-14
created: 2026-09-14T23:10:00Z
updated: 2026-09-14T23:10:00Z
supersedes: [d-0cd3wr]
tags: [mobile, navigation, design, theme]
---

## Context

[[d-0cd3wr]] Amendment 2 established an anchored, borderless four-tab bar with a
dark surface in light mode (`--tab-bar: #131110` under `--background: #fefcf9`),
leaving the dark mode counterpart for [[t-0cdegw]].

Two options for dark mode were designed and trialled on device/emulator:
- **Option A:** Slightly elevated warm dark surface (`#1e1b19` / `#302c29`),
  initially trialled with a 1pt top hairline divider (`#302d2b`).
- **Option B:** Pure pitch-black (`#000000`) borderless tab bar, with the warm
  charcoal page (`#131110`) curving over it via `rounded-b-[20px]`.

## Decision

**Option B is chosen.**

1. **Tab bar surface in dark mode:** `#000000` (pure pitch black).
   In light mode, it remains `#131110`.
2. **Page surface in dark mode:** `#131110` (warm dark charcoal).
3. **No border between tab bar and content:** The tab bar remains completely
   borderless. The boundary is formed purely by the silhouette of the page's
   curved bottom corners (`rounded-b-[20px]`) sitting over the pitch-black base.
4. **Active tab capsule:** Indigo/periwinkle (`#708ade` in dark mode, `#576cb7` in
   light mode).
5. **App-wide rollout:** Tokens are unified in `mobile/src/theme.ts` via
   `LIGHT_COLORS` and `DARK_COLORS`, provided by `useTheme()`, ensuring all
   screens, cards, inputs, and text elements render crisp, high-contrast dark
   mode styling across the entire mobile application.

## Consequences

- Full alignment with [[d-0cd3wr]]'s core architectural principle: no artificial
  horizontal rules across the top of the bar; the content curve over the dark
  foundation *is* the boundary.
- Pitch black `#000000` tab bar provides true OLED black at the bottom of the device,
  grounding the floating content card above it.
- Resolves the react-native-css conditional `@media dark` root variable drop by
  supplying `colors` directly through `useTheme()`.
