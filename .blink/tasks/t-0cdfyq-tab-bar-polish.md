---
id: t-0cdfyq
title: "Tab bar polish pass — small adjustments after the dark-surface sign-off"
status: backlog
milestone: m-0cc02t
created: 2026-08-29T15:00:00Z
updated: 2026-08-29T15:00:00Z
estimate: XS
decisions: [d-0cd3wr]
tags: [mobile, design]
---

The user signed the dark bar off on device — *"it looks good and kind of what i
wanted. may need a little touch for some adjustment but good"* — without naming
the adjustments. This holds the slot so they are not lost.

**Ask the user what specifically to adjust before changing anything.** Do not
guess and do not re-open the settled shape: [[d-0cd3wr]] and both its amendments
are signed off — four tabs, full-bleed, no top border, dark surface, rounded
bottom corners on the content, raised FAB.

Candidates already on the table, none of them requested:
- The bar is the heaviest element in the app, a full-width near-black band
  against warm stone elsewhere — a real departure from [[d-006]]. Only tokens
  have to move if it reads as too much.
- `--tab-bar-foreground` has no consumer and is dead until [[t-0cdegw]].
- Capsule-on-bar contrast is 3.80:1 — clears the 3.0 needed for a UI component,
  but is the tightest ratio in the bar.
