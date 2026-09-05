---
id: d-0cqv2p
title: "Unify mobile screen action affordances into floating SpeedDial — headers never carry leading action buttons"
date: 2026-09-05
status: accepted
created: 2026-09-05T18:52:07Z
updated: 2026-09-05T18:52:07Z
tags: [mobile, ui, design-system]
---

## Context

Originally, screen-level action buttons on mobile were added opportunistically to headers as leading buttons before screen titles (e.g. `AppHeader.action` hosting a filter button on the Jobs screen and a `+` button on the Answers screen).

This resulted in:
1. Header crowding and asymmetric title alignment against the editorial Newsreader serif title.
2. Inconsistent UX across screens: some screens carried leading buttons, others carried FABs, and others had fixed bottom bars (e.g. `JobDetailScreen`'s delete footer).
3. The user explicitly established a unified design standard:
   - "from now on every page which needs an action button will have the same way as the job page. it will be followed for all pages."
   - No leading buttons before screen titles.
   - All primary screen actions must live in a bottom-right floating SpeedDial (`SpeedDial`) using the Google Keep / web mobile hamburger animation (darken + blur backdrop, 56px action circles matching the FAB size, label pills, and cascading stagger).

## Decision

1. **`AppHeader` never carries leading action buttons.**
   - Removed `action?: ReactNode` from `AppHeaderProps` and `AppHeader`.
   - `AppHeader` renders only the editorial serif title on the left and trailing utility actions (Search + AccountMenu) on the right.
2. **Every screen requiring action affordances uses the bottom-right `SpeedDial`.**
   - **Jobs screen:** FAB expands to "Add job" (`+`) and "Filter jobs" (sliders).
   - **Answers screen:** FAB expands to "New answer" (`+`).
   - **Job detail screen:** FAB expands to "Edit job" (pencil) and "Delete job" (trash, destructive).
3. **Motion & Presentation Parity:**
   - Darkened and blurred backdrop (`expo-blur` with `tint="dark"` and `rgba(0, 0, 0, 0.45)` overlay).
   - Action item circular discs are identical 56px (`FAB_SIZE`) to the primary FAB button.
   - Reanimated hide-on-scroll (`useHideOnScroll`) hides the FAB when scrolling down and restores it on scroll up across list views.
   - Screen shell structure wraps scrollable views in `bg-tab-bar` with `rounded-b-[20px] bg-background` to preserve OS chrome curvature above the anchored tab bar (`d-0cd3wr`).

## Consequences

- Sibling pages cannot invent novel action placements or regress to header buttons.
- Header layout is clean, symmetrical, and single-purpose across all routes.
- Action affordances are immediately predictable to users at bottom-right thumb reach.
