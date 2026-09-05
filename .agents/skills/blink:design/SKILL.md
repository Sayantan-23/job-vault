---
name: blink:design
blink_version: 0.5.2
description: Use when designing UI/UX — "design the app", "how should this look", "build a prototype", "set the color scheme". Interviews for design context once, then iterates on a prototype served locally.
---

# Blink design

job-vault records its design context in `.blink/` and iterates on a
prototype served on a temporary localhost server. This skill routes to one of two
reference pages and loads no more than one per invocation.

## Route

Check whether a `docs/design` doc exists in `.blink/docs/`.

- **No `docs/design`** → load `references/01-context.md`. Asks what is not
  yet answered, writes the results, and leaves `docs/design` behind so the
  next invocation routes to prototype mode.
- **`docs/design` exists** → load `references/02-prototype.md`. Reads it
  back, never re-asks what is already answered, and picks up where the last
  round ended.

## Two rules that never change

1. **Visual judgment is user-gated every round.** Nothing is accepted without a
   human reviewing the result in a browser. Automated approval does not exist.
2. **Design context is asked once and read back forever.** If `docs/design`
   exists, those answers are authoritative — re-asking them is the single
   failure mode this skill prevents.

## Design work goes in the tracker

Tasks for design rounds live under a design milestone. Cite `/blink:tracking`
for the full lifecycle contract and `.blink/SCHEMA.md` for the field
reference. Tracker rules apply to design work exactly as to any other.
