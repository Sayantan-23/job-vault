---
id: t-0ccxkk
title: "C0 — Expo foundation: scaffold, tokens, fonts, tab shell, deep links"
status: in_progress
milestone: m-0cc02t
created: 2026-08-29T07:15:35Z
updated: 2026-08-29T08:10:00Z
estimate: M
decisions: [d-0cc2vk, d-0cc24z, d-0cc2w5]
tags: [mobile, expo, foundation]
---

Spec §4.12 (layout), §6 (chunk table), §8 (step list). Blocks everything.

**Scaffold is done** — the user ran `npx create-expo-app@latest mobile` on
2026-08-29. `mobile/` is managed (no `ios/`, no `android/`; prebuild regenerates
them and `.gitignore` already excludes them).

**Pinned versions — read version-matched docs, never `latest`:**

| Package | Version |
|---|---|
| `expo` | `~57.0.18` (**SDK 57**) |
| `react-native` | `0.86.3` |
| `react` | `19.2.3` |

Docs URLs are `https://docs.expo.dev/versions/v57.0.0/…`. The `latest` pages
track the newest SDK and document APIs this project does not have.

**EAS is deliberately deferred to C10** ([[t-0ccxku]]). Decided 2026-08-29: all
development happens on **local** builds (`npx expo run:android` — free, unlimited,
this machine has `ANDROID_HOME`, `adb`, Java 21), which need no EAS account, no
`eas login` and no `extra.eas.projectId`. Do **not** run `eas login` or `eas init`
in this task, and do not block on them.

**Done when**
- `mobile/` laid out per `expo-project-structure`: `src/app` routes-**only**,
  `src/screens`, `src/components`, `src/hooks`, `src/utils`, `src/theme.ts`;
  kebab-case, colocated tests, `@/*` → `./src/*`. Standalone, **not** an npm
  workspace ([[d-0cc2vk]]).
- NativeWind via `expo-tailwind-setup`, with the tokens from
  `frontend-next/src/styles/app/theme.css` ported **under the same names**.
- Geist, Geist Mono, Instrument Serif through `expo-font`.
- **Deep-link scheme** in `app.json` (moved here from C10 — C5 and C6 both need
  it, and it is one line plus route naming).
- Expo Router shell per [[d-0cd3wr]] — **settled, do not re-ask**. Four tabs:
  **Jobs · Answers · Vault · Activity**. Profile/personas/settings hang off a
  header avatar (mirroring web's `AccountMenu`), search is a header icon.
  - A **custom `tabBar` component**, not `NativeTabs` — the latter renders a real
    `UITabBar`/`BottomNavigationView` and will not take this silhouette.
  - Full-bleed, rounded **top** corners only, painted into the bottom safe area
    (`react-native-safe-area-context`). That trio is what reads as OS chrome.
  - Icon **+** Geist Mono label. Stone surface, hairline top border, flat muted
    indigo active capsule that **stretches** between tabs. Near-zero shadow, and
    **no frosted glass** — it would break [[d-006]] and is a 2026 default anyway.
  - The FAB is **not** part of the bar: raised clear above it, right side, never
    breaking its edge. Hides on scroll-down, returns on scroll-up.
  - **Screenshot it on a real device before C2 hardens anything.** The user signed
    off on the shape, not on how it looks.
- `jest-expo` + `@testing-library/react-native` wired, one smoke test passing.
- A `make mobile` target, or a written note in `CLAUDE.md` saying mobile is the
  documented exception to "everything goes through the Makefile" (Metro runs on
  the host, not in Compose).
- `mobile/.env` holding `EXPO_PUBLIC_API_URL` — the second documented exception
  to [[d-005]], alongside `frontend-next/.env.local`, because Metro is not in
  Compose and cannot read the root `.env`. Record it in `CLAUDE.md`.

**Rules.** `npx expo install`, never raw `npm install`. Local
`npx expo run:android` is free and unlimited (this machine has `ANDROID_HOME`,
`adb`, Java 21); **cloud EAS builds need explicit approval** — 10–20 min against
a monthly quota.

Skills: `expo-overview` first, then `expo-project-structure`,
`expo-tailwind-setup`, `expo-router`.

---
*Cold-start: read `docs/superpowers/specs/2026-08-28-mobile-app-expo-scope.md` §8 first — it is written to be read with no other
context. Repo root is `git rev-parse --show-toplevel` (this repo is worked on
from two machines; never hardcode a home path).*
