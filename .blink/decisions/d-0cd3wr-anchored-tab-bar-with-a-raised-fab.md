---
id: d-0cd3wr
title: "Anchored four-tab bar, raised FAB, six web routes regrouped into four"
status: accepted
date: 2026-08-29
created: 2026-08-29T07:15:35Z
updated: 2026-08-29T07:15:35Z
tags: [mobile, navigation, design]
---

## Context

Spec §3.5 proposed a bottom tab bar of Jobs · Answers · Timeline · Profile and
flagged it as never confirmed. Two things made it unbuildable as written. The web
app's `NAV` (`sidebar-nav.tsx:11`) is **six** items — Jobs, Personas, Résumés,
Cover letters, Answers, Timeline — and Material caps a bottom bar at five before
tap targets crowd. And §4.4 had already allocated the bottom-right corner to an
add-job FAB, which navigation also wanted.

Web's mobile nav is a Google-Keep-style speed-dial off a hamburger in a **top**
sticky bar (`mobile-header.tsx:13`). Porting that as-is was considered and
rejected: it makes every navigation two taps and leaves no persistent indicator
of the current section.

## Options

- **Speed-dial only, no bar.** Fewest controls, most screen. Rejected: two taps
  per navigation and no "where am I", which fails the accessibility goal.
- **FAB docked in the centre of the bar.** Common, but mixes a primary action
  into a row of destinations and reads busy when spacing is tight.
- **Floating pill + detached FAB beside it** (the Google Photos shape, shipped
  iOS Feb 2026 / Android Jul 2026). Rejected on brand — see Consequences.
- **Anchored full-bleed bar with the FAB raised above it.** Chosen.

## Decision

**Four tabs, regrouped from six routes:**

| Tab | Holds | Why |
|---|---|---|
| Jobs | list, detail, capture | home, T1 |
| Answers | library, copy chips | T1 — the app's second reason to exist, stays top-level |
| Vault | résumés + cover letters | both T2 **read-only** — an archive you read |
| Activity | timeline **+** notifications | both read-only reverse-chron feeds; carries the unread badge |

**Answers is deliberately not inside Vault.** An earlier grouping put résumés,
cover letters and answers together. Answers is an active tool used while standing
in an application form; the other two are a reading archive. Grouping them taxes
the second-most-important flow on the phone.

**Profile, personas and settings leave the bar entirely** and hang off a header
avatar, mirroring web's `AccountMenu`. All three are T3 or trimmed.

**Shell geometry** — copied from a reference the user supplied, geometry only:

- Full-bleed bar, **not** a floating pill. Rounded **top** corners only, painted
  into the bottom safe area so there is no gap at the screen edge. That trio is
  what produces the "it came from the OS" read.
- **The FAB clears the bar completely.** It does not break or notch the bar's top
  edge (the reference does; we do not), and it sits right, not centre. Nothing
  overlaps a tab target.
- FAB hides on scroll-down and returns on scroll-up — bar plus FAB otherwise cost
  ~130pt of an 844pt screen.

**Icon + label**, labels in Geist Mono. Not icon-only: "Vault" and "Answers" have
no legible icon, so two of four tabs would be a guess. Four tabs at 390px get
~97px each, which fits a label comfortably.

## Consequences

**This cannot use Expo Router `NativeTabs`.** That renders a real `UITabBar` /
`BottomNavigationView` and will not take a custom silhouette, so the bar is a
custom `tabBar` component with the inset from `react-native-safe-area-context`.
Consistent with [[d-0cc24z]] — the OS owns system moments, we own content chrome —
but it does mean the bar is ours to maintain.

**The material is explicitly not the reference's.** The reference is near-black
with a saturated red FAB and heavy elevation. Ported straight across it would
break [[d-006]]: stone surface with a hairline top border, flat muted indigo FAB,
near-zero shadow. The FAB reads as raised through the bar's hairline, not a drop
shadow.

**Frosted glass is rejected on purpose.** The 2026 trend is a blurred "liquid
glass" pill; Google shipping it to Photos made it a default rather than a
differentiator, and `backdrop-filter` plus elevation contradicts a near-zero-shadow
system. What distinguishes this bar instead: typographic labels where everyone
else is icon-only, a flat hairline pill on stone, and one muted-indigo capsule
that **stretches** between tabs rather than teleporting.

**Downstream:** C8 ships inside the Vault tab, C6 becomes the Activity tab with
the timeline/notification merge, and C9 is reached from the header avatar rather
than a tab.

Build the shell early in C0 and screenshot it on a real device before C2 hardens
anything — the user has signed off on the idea, not on how it looks.
