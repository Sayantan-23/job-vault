---
name: blink:design
blink_version: 0.5.2
description: Design context interview — reads project.md, docs/, and decisions/, writes docs/design spec with palette, typography, device, and accessibility sections, one decision per real commitment, tasks under a design milestone.
---

# Design context — read first, write once

You are here because `.blink/docs/` has no `design` doc yet. This page
runs once. When it finishes a `docs/design` spec will exist and every future
`/blink:design` invocation will route to `02-prototype.md`.

## Read-first sources

Read all of these before asking anything. Whatever they already answer is skipped.

- `.blink/project.md` — audience, goals, non-goals, what the project is for
- Every file in `.blink/docs/` — prior specs, research notes, existing design artefacts
- Every file in `.blink/decisions/` — real choices already made, constraints already accepted

Adaptive-skip everywhere: if the invoking message or an existing entity already
answers one of the six questions below, mark it answered and move on.

## The six gap questions

Ask only the questions not already answered by the read-first sources above. One
question at a time; a follow-up that narrows an answer is fine, a new question
is not until the previous one is closed.

1. **Audience** — who uses this? Role, context, technical level, primary device.
2. **Brand and colour references** — logos, hex values, reference sites, "feels
   like X but not Y". Omit for internal tools with no brand brief.
3. **Typography** — system fonts only, a specific typeface, or open choice?
   Serif or sans? Any size or weight constraints the brand enforces?
4. **Style tone** — minimal or dense, playful or serious, data-forward or
   editorial? A reference screenshot is worth ten adjectives.
5. **Target devices** — desktop-first, mobile-first, both equally, or a
   specific viewport range?
6. **Accessibility bar** — WCAG A / AA / AAA; keyboard navigation required;
   screen reader support; any known constraints.

## Writes — in this order

Create references before the entities that point at them.

### `.blink/docs/design.md` (type: spec)

Frontmatter: `id: design`, `title: Design system — job-vault`,
`status: active`, `type: spec`.

Required body sections:

    ## Audience
    ## Palette      (primary / secondary / neutral / semantic tokens, hex or intent)
    ## Typography   (families, sizes, weights, line-heights)
    ## Devices      (primary device, viewport range, breakpoints)
    ## Accessibility (WCAG level, keyboard nav, screen reader, other)

### One decision file per real commitment

A commitment is a choice that would cost real effort to reverse: a specific
palette, a chosen typeface, a device-only scope. An open range is not a
decision yet. Each decision: `id: <blink id d>`, `status: accepted`, `date: <today>`,
context / options / decision / consequences in the body. See
`.blink/SCHEMA.md` for required fields; `/blink:tracking` for the
write-before-commit rule.

### Tasks under a design milestone

Create a design milestone (`status: active`, `order: <next>`) then one task per
work item — wire-frame round, hi-fi pass, palette validation, accessibility
audit. Tasks start at `status: backlog`; the file is the plan, not the record.

## Validate

Run `blink validate` after all writes. Zero errors is the bar. Fix anything it
flags before reporting done.
