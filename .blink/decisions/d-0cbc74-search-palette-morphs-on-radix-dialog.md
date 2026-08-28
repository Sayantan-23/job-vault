---
id: d-0cbc74
title: The search palette morphs, but rides on Radix Dialog primitives
status: accepted
date: 2026-08-28
created: 2026-08-28T00:00:00Z
updated: 2026-08-28T00:00:00Z
tags: [search, frontend, ui]
---

## Context

[[t-0c5wyz]] designs the global search trigger as a bespoke morph: a
`position: fixed` element expanding from a 44px circle beside the notification
bell into a card centred on the content column. Recon before implementation
surfaced two costs the task did not account for.

**Two anchor origins, not one.** The floating cluster the task anchors to is
`lg:block` only (`app-shell.tsx:46`); below `lg` the bell lives in
`mobile-header.tsx:90` instead. A morph hard-coded to the cluster has no origin
on mobile.

**It would hand-roll what we already have.** A free-standing `fixed` element
owns its own focus trap, Escape handling, scroll lock, focus return to the
trigger, outside-click dismissal and `data-theme-scope` re-application inside
the portal. `ui/dialog.tsx` and `ui/sheet.tsx` already do all of it via Radix,
and CLAUDE.md's "one pattern per concern" makes a fourth overlay pattern a cost
in itself.

A plain centred dialog palette (the Linear/GitHub/Vercel shape) was put to the
user against the morph. The user chose the morph knowingly, for aesthetics,
asking to fall back to the plain dialog if it does not land in the browser.

## Decision

Build the morph, but as **styling over `DialogPrimitive`**, not as a
free-standing element.

- `DialogPrimitive.Root` / `Portal` / `Content` supply behaviour. `Content` is
  an unstyled div, so its position and geometry are ours to override.
- The morph animates off the `data-[state=open]` / `data-[state=closed]`
  attributes Radix stamps — the same hook `sheet.tsx` and `anchored-popover.tsx`
  already animate from, so it reads as the existing convention rather than a new
  one.
- The origin is read with `getBoundingClientRect()` off **the trigger that was
  clicked**, into `--jv-search-x/y`. Desktop cluster and mobile header both
  anchor correctly with no branching, which is what dissolves the two-origins
  problem.
- The real trigger fades out while open and the card carries its own close
  control at the right edge, so the icon cross-fade reads as one element
  travelling. Radix still returns focus to the real trigger on close.
- `motion-reduce:` drops the geometry transition and lands the card centred.

## Consequences

- **The fallback is free.** Reduced-motion already renders the plain centred
  dialog, so abandoning the morph is deleting the morph CSS, not a rewrite.
  This is the property the user asked for.
- Combobox semantics are still ours to build on top — `role="combobox"`,
  `aria-expanded`, `aria-controls`, `aria-activedescendant`, a `role="listbox"`
  of results, arrow keys, Enter to select. Radix Dialog gives no combobox.
- `width`/`height` are not compositor-accelerated, as [[t-0c5wyz]] notes. One
  element for ~300ms is acceptable; recorded rather than hidden.
- **Revisit when** the morph is seen in the browser at 1440 and 390. The user
  reserved the right to drop it.
