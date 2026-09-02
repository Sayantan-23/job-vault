---
id: d-0cl6ul
title: "The FAB is not an IconButton — one control, not a duplication"
date: 2026-09-02
status: accepted
tags: [mobile, ui]
---

`CLAUDE.md`'s named recurring defect is "a new page hand-rolls a pattern a
sibling already implements, slightly differently." [[t-0cgtgr]] flagged
`app-header.tsx` and `fab.tsx` as two hand-rolled copies of the circular-icon
pressable that `IconButton` ([[t-0ccxkm]]) now owns.

`app-header.tsx` was migrated. `fab.tsx` was **not**, and this records why
that is correct rather than a gap.

The FAB and IconButton share only the shape "round pressable with a glyph."
Every dimension that defines a control differs:

| | IconButton | Fab |
|---|---|---|
| Box | 36px (`size-9`) | 56px (`FAB_SIZE` from `theme.ts`) |
| Surface | transparent | `bg-primary` |
| Ink | `text-muted-foreground` | `text-primary-foreground` |
| Stroke | 1.75 | 2 |
| Wrapper | none | `Animated.View` with position + hide-on-scroll |
| Role | quiet utility | primary action |

Routing the FAB through `IconButton` means four new props with one caller each
(box-size override, surface `className`, `strokeWidth` override, and the
animated wrapper `IconButton` cannot own because its caller's `useAnimatedStyle`
depends on `FAB_SIZE` + `FAB_GAP`). That is the speculative-flexibility
abstraction the consistency rules exist to prevent — the same class of defect
as duplication, one layer up.

**The pattern wins, not the component.** "A circular pressable with a glyph" is
not a pattern that needs one component when the callers differ on every
dimension that defines them. `app-header.tsx` was a real duplication (same 36px,
same quiet tint, same stroke); `fab.tsx` is a different control that happens to
be round.

Recorded so a future agent does not re-open this and grow `IconButton` for
conformance.
